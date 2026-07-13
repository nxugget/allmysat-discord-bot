import "dotenv/config";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import type { ChatInputCommandInteraction, AutocompleteInteraction, SlashCommandBuilder } from "discord.js";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnv } from "./config/env.js";
import { loadLaunchSites } from "./lib/launchSites.js";
import { logger } from "./lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

validateEnv();

await loadLaunchSites();

interface CommandModule {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

declare module "discord.js" {
  interface Client {
    commands: Collection<string, CommandModule>;
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandsDir = join(__dirname, "commands");
const commandFiles = readdirSync(commandsDir).filter(
  (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts")
);

for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  if (mod.data && mod.execute) {
    client.commands.set(mod.data.name, mod);
    logger.info(`Loaded command: /${mod.data.name}`);
  }
}

const eventsDir = join(__dirname, "events");
const eventFiles = readdirSync(eventsDir).filter(
  (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts")
);

for (const file of eventFiles) {
  const mod = await import(`./events/${file}`);
  if (mod.once) {
    client.once(mod.name, (...args) => mod.execute(...args));
  } else {
    client.on(mod.name, (...args) => mod.execute(...args));
  }
  logger.info(`Loaded event: ${mod.name}`);
}

await client.login(process.env.DISCORD_TOKEN);

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully…");
  client.destroy();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully…");
  client.destroy();
  process.exit(0);
});
