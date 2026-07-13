import "dotenv/config";
import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnv, env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

validateEnv();

const commands: { name: string; description: string; options?: unknown[] }[] = [];
const commandsDir = join(__dirname, "commands");
const commandFiles = readdirSync(commandsDir).filter(
  (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts")
);

for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  if (mod.data) {
    commands.push(mod.data.toJSON());
  }
}

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

const isGuildDeploy = Boolean(env.DISCORD_GUILD_ID);
const target = isGuildDeploy
  ? `guild ${env.DISCORD_GUILD_ID}`
  : "globally";

logger.info(`Deploying ${commands.length} command(s) to ${target}…`);

try {
  const route = isGuildDeploy
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID!)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);
  await rest.put(route, { body: commands });
  logger.info(`Slash commands deployed: ${commands.length}`);
} catch (err) {
  logger.error("Failed to deploy commands:", err);
  process.exit(1);
}
