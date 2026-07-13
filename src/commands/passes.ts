import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import { searchSatellites, getSatelliteByNoradId } from "../services/satellite.js";
import { predictPasses } from "../services/passes.js";
import { geocode, searchNominatim } from "../lib/geocode.js";
import { EMBED_COLOR, PASSES_DISPLAY_LIMIT } from "../lib/constants.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("passes")
  .setDescription("Upcoming satellite passes over a city")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Satellite name or NORAD ID")
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(100)
  )
  .addStringOption((option) =>
    option
      .setName("city")
      .setDescription("City name, e.g. Paris, Tokyo, New York")
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(100)
  )
  .addIntegerOption((option) =>
    option
      .setName("min_elevation")
      .setDescription("Minimum elevation in degrees (default: 20)")
      .setMinValue(5)
      .setMaxValue(80)
  );

export async function autocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const focused = interaction.options.getFocused(true);
  const value = focused.value.trim();

  if (focused.name === "city") {
    if (value.length < 2) {
      await interaction.respond([]);
      return;
    }

    const results = await searchNominatim(value);
    await interaction.respond(
      results.map((c) => ({
        name: c.name,
        value: `${c.lat},${c.lon}|${c.name}`,
      }))
    );
    return;
  }

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
  const city = interaction.options.getString("city", true).trim();
  const minElevation = interaction.options.getInteger("min_elevation") ?? 20;

  const noradId = parseInt(query, 10);
  if (isNaN(noradId)) {
    await interaction.reply({
      content: "Select a satellite from the suggestions.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    let lat = 0;
    let lon = 0;
    let displayName = "";

    if (city.includes("|")) {
      const [coords, name] = city.split("|");
      const [latStr, lonStr] = coords.split(",");
      lat = parseFloat(latStr);
      lon = parseFloat(lonStr);
      displayName = name;
    } else {
      const location = await geocode(city);
      if (!location) {
        await interaction.editReply({
          content: `Could not find **${city}**. Try picking from the suggestions.`,
        });
        return;
      }
      lat = location.lat;
      lon = location.lon;
      displayName = location.displayName;
    }

    const result = await predictPasses(noradId, lat, lon, minElevation);

    if (result.isGeo) {
      const geo = result.geoInfo;
      const geoText = geo
        ? `Elevation: ${geo.elevation}°, Azimuth: ${geo.azimuth}°`
        : "Position data unavailable.";

      const embed = new EmbedBuilder()
        .setTitle(result.satelliteName)
        .setColor(EMBED_COLOR)
        .setDescription(
          `Geostationary satellite. Appears fixed in the sky.\n\n` +
            `From ${displayName.split(",")[0].trim()}:\n${geoText}`
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (result.passes.length === 0) {
      await interaction.editReply({
        content: `No passes above **${minElevation}°** found for **${result.satelliteName}** over **${city}** in the next 48 hours.`,
      });
      return;
    }

    const embed = buildPassesEmbed(result, displayName, minElevation);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "No TLE available for this satellite.") {
      const sat = await getSatelliteByNoradId(noradId);
      const name = sat?.name ?? String(noradId);
      await interaction.editReply({
        content: `No TLE available for **${name}**. Pass prediction requires fresh orbital data.`,
      });
      return;
    }
    logger.error("Passes computation failed:", err);
    await interaction.editReply({
      content: "Failed to compute passes. Please try again later.",
    });
  }
}

function buildPassesEmbed(
  result: Awaited<ReturnType<typeof predictPasses>>,
  locationName: string,
  minElevation: number
): EmbedBuilder {
  const location = locationName.split(",")[0].trim();
  const passes = result.passes.slice(0, PASSES_DISPLAY_LIMIT);

  const lines = passes.map((p) => {
    const fmt = (d: Date) =>
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });

    const day = p.rise.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    const riseCard = azimuthToCardinal(p.azimuthRise);
    const setCard = azimuthToCardinal(p.azimuthSet);

    return `**${day}**  ${fmt(p.rise)} (${riseCard}) → ${fmt(p.set)} (${setCard})  .  ${p.maxElevation}°`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`${result.satelliteName} — Passes`)
    .setColor(EMBED_COLOR)
    .setDescription(
      `Over **${location}** (min ${minElevation}° elevation, next 48h, times in UTC)\n\n${lines.join("\n")}`
    );

  if (result.passes.length > PASSES_DISPLAY_LIMIT) {
    embed.setFooter({ text: `Showing ${PASSES_DISPLAY_LIMIT} of ${result.passes.length} passes` });
  }

  return embed;
}

function azimuthToCardinal(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const i = Math.round(deg / 22.5) % 16;
  return dirs[i];
}
