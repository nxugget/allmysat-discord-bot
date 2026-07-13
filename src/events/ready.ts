import { Events, Client } from "discord.js";
import { logger } from "../lib/logger.js";

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>): void {
  logger.info(`Ready — logged in as ${client.user.tag}`);
}
