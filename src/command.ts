export async function QmpCommand<T = unknown>(
  command: string,
  args: Record<string, unknown> = {},
) {
  return new Promise<T>((resolve, reject) => {
    try {
      const isProxmox = Bun.env.USE_PROXMOX === "true";
      const hostname = isProxmox
        ? (Bun.env.PROXMOX_VNC_IP ?? "localhost")
        : "localhost";
      const port = isProxmox
        ? parseInt(Bun.env.PROXMOX_VNC_PORT ?? "4444", 10)
        : 4444;

      Bun.connect({
        hostname,
        port,
        socket: {
          data(sock, data) {
            const resp = data.toString();
            if (resp.includes("QMP")) {
              // greeting
              sock.write(
                JSON.stringify({ execute: "qmp_capabilities" }) + "\n",
              );
              sock.write(
                JSON.stringify({ execute: command, arguments: args }) + "\n",
              );
            } else if (resp.includes("return")) {
              // response
              resolve(JSON.parse(resp));
              sock.end();
            }
          },
          error(_socket, error) {
            reject(`QMP socket error: ${error}`);
          },
        },
      });
    } catch (e) {
      reject(`Failed to connect to QMP socket: ${e}`);
    }
  });
}
