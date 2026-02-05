export async function QmpCommand<T = unknown>(
  command: string,
  args: Record<string, unknown> = {},
) {
  return new Promise<T>((resolve, reject) => {
    try {
      Bun.connect({
        hostname: "localhost",
        port: 4444,
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
