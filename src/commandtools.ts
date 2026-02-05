import type { GenericMessageEvent } from "@slack/web-api";
import type { WebClient } from "@slack/web-api";

export function prefixUserid(title: string, msg: GenericMessageEvent) {
  return `@${msg.user} | ${title}`;
}

export function reactWith(
  name: string,
  msg: GenericMessageEvent,
  client: WebClient,
) {
  if (Bun.env.NOREACTIONS === "true") return;
  client.reactions.add({
    name: name,
    channel: msg.channel,
    timestamp: msg.ts,
  });
}
