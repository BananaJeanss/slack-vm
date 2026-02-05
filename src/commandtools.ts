export function prefixUserid(title: string, msg: any) {
  return `@${msg.user} | ${title}`;
}

export   function reactWith(name: string, msg: any, client: any) {
    if (Bun.env.NOREACTIONS === "true") return;
    client.reactions.add({
      name: name,
      channel: msg.channel,
      timestamp: msg.ts,
    });
  }