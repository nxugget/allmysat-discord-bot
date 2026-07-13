import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  getSatelliteByNoradId,
  getSatelliteByName,
  searchSatellites,
} from "../services/satellite.js";
import { formatCountry } from "../lib/countries.js";
import { formatLaunchSite } from "../lib/launchSites.js";
import { EMBED_COLOR } from "../lib/constants.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("sat")
  .setDescription("Look up a satellite by name or NORAD ID")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Satellite name or NORAD ID")
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(100)
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

  await interaction.deferReply();

  try {
    const noradId = parseInt(query, 10);
    const sat = isNaN(noradId)
      ? await getSatelliteByName(query)
      : await getSatelliteByNoradId(noradId);

    if (!sat) {
      await interaction.editReply({
        content: `No satellite found for **${query}**. It may have decayed or not yet been added to the database.`,
      });
      return;
    }

    const embed = buildSatelliteEmbed(sat);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error("Sat lookup failed:", err);
    await interaction.editReply({
      content: `Failed to look up **${query}**. Please try again later.`,
    });
  }
}

function buildSatelliteEmbed(
  sat: NonNullable<Awaited<ReturnType<typeof getSatelliteByNoradId>>>
): EmbedBuilder {
  const title = sat.alternate_name
    ? `${sat.name} (${sat.alternate_name})`
    : sat.name;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(EMBED_COLOR);

  const fields: { name: string; value: string; inline: boolean }[] = [];

  const statusLabel = sat.status ? formatStatus(sat.status) : "—";
  const category = sat.category ?? "—";
  const launchDate = sat.launch_date ?? "—";

  fields.push(
    { name: "NORAD ID", value: String(sat.norad_id), inline: true },
    { name: "Type", value: sat.object_type ?? "—", inline: true },
    { name: "Orbit", value: sat.orbit ?? "—", inline: true }
  );

  fields.push(
    { name: "Status", value: statusLabel, inline: true },
    { name: "Category", value: category, inline: true },
    { name: "Launch Date", value: launchDate, inline: true }
  );

  if (sat.country && sat.country.length > 0) {
    const formatted = sat.country.map(formatCountry);
    fields.push({
      name: formatted.length > 1 ? "Countries" : "Country",
      value: formatted.join("\n"),
      inline: false,
    });
  }

  if (sat.launch_site) {
    const siteName = formatLaunchSite(sat.launch_site);
    if (siteName) {
      fields.push({
        name: "Launch Site",
        value: siteName,
        inline: false,
      });
    }
  }

  embed.addFields(fields);

  return embed;
}

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "Active";
    case "decayed":
      return "Decayed";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}
