export async function QmpCommand(command: string, args: any = {}) {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const socket = await Bun.connect({
        hostname: "localhost",
        port: 4444,
        socket: {
          data(socket, data) {
            const resp = data.toString();
            if (resp.includes("QMP")) {
              // greeting
              socket.write(
                JSON.stringify({ execute: "qmp_capabilities" }) + "\n",
              );
              socket.write(
                JSON.stringify({ execute: command, arguments: args }) + "\n",
              );
            } else if (resp.includes("return")) {
              // response
              resolve(JSON.parse(resp));
              socket.end();
            }
          },
          error(socket, error) {
            reject(`QMP socket error: ${error}`);
          },
        },
      });
    } catch (e) {
      reject(`Failed to connect to QMP socket: ${e}`);
    }
  });
}
