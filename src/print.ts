import sharp from "sharp";
import { QmpCommand } from "./command";
import fs from "fs";
import { sleep } from "bun";

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
      const host = Bun.env.PROXMOX_HOST;
      const node = Bun.env.PROXMOX_NODE;
      const vmid = Bun.env.PROXMOX_VMID;
      const token = Bun.env.PROXMOX_API_TOKEN;

      const res = await fetch(
        `https://${host}:8006/api2/png/nodes/${node}/qemu/${vmid}/screenshot`,
        {
          headers: { Authorization: `PVEAPIToken=${token}` },
          // proxmox uses self-signed certs
          tls: { rejectUnauthorized: false },
        },
      );

      if (!res.ok) throw new Error(`Proxmox API returned ${res.status}`);

      fs.writeFileSync(pngPath, Buffer.from(await res.arrayBuffer()));
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
