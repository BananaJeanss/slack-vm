import sharp from "sharp";
import { QmpCommand } from "./command";
import fs from "fs";
import { sleep } from "bun";

// VNC Client for proxmox screenshots cause
// ssh + qmp screendump is too bulky
// and no other ways afaik
async function rfbScreenshot(
  host: string,
  port: number,
): Promise<{ data: Buffer; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    const waiters: Array<{ n: number; resolve: (b: Buffer) => void }> = [];

    function drain() {
      while (waiters.length > 0 && buf.length >= waiters[0]!.n) {
        const { n, resolve: res } = waiters.shift()!;
        res(Buffer.from(buf.subarray(0, n)));
        buf = buf.subarray(n);
      }
    }

    function push(data: Buffer) {
      buf = Buffer.concat([buf, data]);
      drain();
    }

    function read(n: number): Promise<Buffer> {
      return new Promise((res) => {
        waiters.push({ n, resolve: res });
        drain();
      });
    }

    Bun.connect({
      hostname: host,
      port,
      socket: {
        async open(sock) {
          try {
            // 1. Version handshake
            await read(12); // server version, discard
            sock.write(Buffer.from("RFB 003.008\n"));

            // 2. Security types
            const nTypes = (await read(1)).readUInt8(0);
            if (nTypes === 0) {
              const len = (await read(4)).readUInt32BE(0);
              const msg = (await read(len)).toString();
              throw new Error(`VNC refused: ${msg}`);
            }
            const types = await read(nTypes);
            if (!types.includes(1))
              throw new Error("VNC: None auth not offered — add ,password=off or no auth option to -vnc arg");
            sock.write(Buffer.from([1])); // select None

            // SecurityResult (RFB 3.8)
            const result = (await read(4)).readUInt32BE(0);
            if (result !== 0) throw new Error("VNC auth failed");

            // 3. ClientInit: shared = 1
            sock.write(Buffer.from([1]));

            // 4. ServerInit: 2+2 size, 16 bytes pixel format, 4 bytes name length
            const init = await read(24);
            const fbW = init.readUInt16BE(0);
            const fbH = init.readUInt16BE(2);
            const bpp = init.readUInt8(4);
            const bigEndian = init.readUInt8(6) !== 0;
            const redMax = init.readUInt16BE(8);
            const greenMax = init.readUInt16BE(10);
            const blueMax = init.readUInt16BE(12);
            const redShift = init.readUInt8(14);
            const greenShift = init.readUInt8(15);
            const blueShift = init.readUInt8(16);
            const nameLen = init.readUInt32BE(20);
            await read(nameLen);

            const bytesPerPixel = bpp / 8;

            // 5. SetEncodings: Raw (0)
            const enc = Buffer.alloc(8);
            enc[0] = 2;
            enc.writeUInt16BE(1, 2);
            enc.writeInt32BE(0, 4);
            sock.write(enc);

            // 6. FramebufferUpdateRequest: full, non-incremental
            const req = Buffer.alloc(10);
            req[0] = 3;
            req[1] = 0;
            req.writeUInt16BE(0, 2);
            req.writeUInt16BE(0, 4);
            req.writeUInt16BE(fbW, 6);
            req.writeUInt16BE(fbH, 8);
            sock.write(req);

            // 7. FramebufferUpdate — skip non-framebuffer messages (Bell, ServerCutText)
            let nRects = 0;
            while (true) {
              const msgType = (await read(1)).readUInt8(0);
              if (msgType === 0) {
                await read(1); // padding
                nRects = (await read(2)).readUInt16BE(0);
                break;
              } else if (msgType === 2) {
                // Bell — no payload
              } else if (msgType === 3) {
                // ServerCutText
                await read(3);
                const len = (await read(4)).readUInt32BE(0);
                await read(len);
              } else {
                throw new Error(`VNC: unexpected message type ${msgType}`);
              }
            }

            // 8. Read rectangles and compose RGB buffer
            const rgb = Buffer.alloc(fbW * fbH * 3);

            for (let i = 0; i < nRects; i++) {
              const rect = await read(12);
              const rx = rect.readUInt16BE(0);
              const ry = rect.readUInt16BE(2);
              const rw = rect.readUInt16BE(4);
              const rh = rect.readUInt16BE(6);
              const encoding = rect.readInt32BE(8);
              if (encoding !== 0)
                throw new Error(`VNC: unsupported encoding ${encoding}`);

              const pixels = await read(rw * rh * bytesPerPixel);

              for (let py = 0; py < rh; py++) {
                for (let px = 0; px < rw; px++) {
                  const si = (py * rw + px) * bytesPerPixel;
                  const di = ((ry + py) * fbW + (rx + px)) * 3;
                  const v = bigEndian
                    ? pixels.readUInt32BE(si)
                    : pixels.readUInt32LE(si);
                  rgb[di] = (v >> redShift) & redMax;
                  rgb[di + 1] = (v >> greenShift) & greenMax;
                  rgb[di + 2] = (v >> blueShift) & blueMax;
                }
              }
            }

            sock.end();
            resolve({ data: rgb, width: fbW, height: fbH });
          } catch (e) {
            sock.end();
            reject(e);
          }
        },
        data(_sock, chunk) {
          push(Buffer.from(chunk));
        },
        error(_sock, err) {
          reject(err);
        },
        close() {
          if (waiters.length > 0)
            reject(new Error("VNC connection closed unexpectedly"));
        },
      },
    });
  });
}

export default async function printScreen(): Promise<string | null> {
  const timestamp = Date.now();
  const pngPath = `./screenshots/screenshot-${timestamp}.png`;

  try {
    try {
      fs.mkdirSync("./screenshots");
    } catch {
      // dir already exists
    }

    if (Bun.env.USE_PROXMOX === "true") {
      const host = Bun.env.PROXMOX_VNC_IP ?? "localhost";
      const port = parseInt(Bun.env.PROXMOX_SCREENSHOT_PORT ?? "5944", 10);

      const { data, width, height } = await rfbScreenshot(host, port);

      await sharp(data, { raw: { width, height, channels: 3 } })
        .png()
        .toFile(pngPath);

      return pngPath;
    }

    const ppmPath = `./screenshots/screenshot-${timestamp}.ppm`;

    await QmpCommand("screendump", { filename: ppmPath });

    for (let i = 0; i < 20; i++) {
      if (fs.existsSync(ppmPath) && fs.statSync(ppmPath).size > 100) break;
      await sleep(50);
    }

    // Read PPM file and convert to PNG using sharp
    // 1. Read the PPM file
    // 2. Parse the header to get width, height
    // 3. Extract pixel data
    // 4. Feed RAW data to Sharp
    const fileBuffer = fs.readFileSync(ppmPath);

    let headerEnd = 0;
    let newlineCount = 0;

    while (newlineCount < 3 && headerEnd < fileBuffer.length) {
      if (fileBuffer[headerEnd] === 0x0a) {
        newlineCount++;
      }
      headerEnd++;
    }

    const headerString = fileBuffer.subarray(0, headerEnd).toString("ascii");
    const dims = headerString.match(/P6\s+(\d+)\s+(\d+)\s+255/);

    if (!dims || !dims[1] || !dims[2]) {
      throw new Error(`Could not parse PPM header: ${headerString}`);
    }

    const width = parseInt(dims[1]);
    const height = parseInt(dims[2]);

    const pixelData = fileBuffer.subarray(headerEnd);

    await sharp(pixelData, {
      raw: {
        width: width,
        height: height,
        channels: 3,
      },
    })
      .png()
      .toFile(pngPath);

    fs.unlinkSync(ppmPath);
    return pngPath;
  } catch (err) {
    console.error("Screenshot failed:", err);
    return null;
  }
}
