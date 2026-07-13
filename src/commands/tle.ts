import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { getTleByNoradId, searchSatellites } from "../services/satellite.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("tle")
  .setDescription("Get the latest TLE for a satellite")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Satellite name or NORAD ID")
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(10)
  );

export async function autocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const value = interaction.options.getFocused().trim();
  if (value.length < 2) {
    await interaction.respond([]);
    return;
  }

  const results = await searchSatellites(value, 25);
  await interaction.respond(
    results.map((r) => ({
      name: r.alternate_name
        ? `${r.name} (${r.alternate_name})`
        : r.name,
      value: String(r.norad_id),
    }))
  );
}

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const query = interaction.options.getString("query", true).trim();
  const noradId = parseInt(query, 10);

  if (isNaN(noradId)) {
    await interaction.reply({
      content: `**${query}** is not a valid NORAD ID. Please select a satellite from the suggestions.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const tle = await getTleByNoradId(noradId);

    if (!tle) {
      await interaction.editReply({
        content: `No TLE available for NORAD **${noradId}**.`,
      });
      return;
    }

    await interaction.editReply({
      content: `**TLE for ${tle.satelliteName} (NORAD ${noradId})**\n\`\`\`\n${tle.tle_line1}\n${tle.tle_line2}\n\`\`\``,
    });
  } catch (err) {
    logger.error("TLE lookup failed:", err);
    await interaction.editReply({
      content: `Failed to fetch TLE for NORAD **${noradId}**. Please try again later.`,
    });
  }
}
