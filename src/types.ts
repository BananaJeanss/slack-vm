import type { App, SayFn } from "@slack/bolt";

export interface CommandModule {
  trigger: string[];
  handler: CommandHandler;
}

export type CommandHandler = (
  args: string[],
  say: SayFn,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any,
  app: App,
) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SlackMessage = any;
