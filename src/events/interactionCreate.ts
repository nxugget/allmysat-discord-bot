import { Events, BaseInteraction, ChatInputCommandInteraction } from "discord.js";
import { logger } from "../lib/logger.js";

export const name = Events.InteractionCreate;

export async function execute(
  interaction: BaseInteraction
): Promise<void> {
  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      await command.autocomplete(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    logger.error(`Command /${interaction.commandName} failed:`, err);

    if (interaction.isRepliable()) {
      const content = "Failed to run command. Please try again later.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }
}
