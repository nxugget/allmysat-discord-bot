import { GEOCODE_THROTTLE_MS } from "./constants.js";

/**
 * Convert a city name to latitude and longitude using OpenStreetMap Nominatim.
 * Rate-limited: Nominatim asks for max 1 req/s. We use a 1.1s throttle.
 */

let lastRequest = 0;

export interface GeocodedLocation {
  lat: number;
  lon: number;
  displayName: string;
}

export async function geocode(city: string): Promise<GeocodedLocation | null> {
  const now = Date.now();
  const wait = lastRequest + GEOCODE_THROTTLE_MS - now;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AllMySat-Discord-Bot/1.0" },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];

    lastRequest = Date.now();

    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

/**
 * Search cities by name using Nominatim. Returns up to 25 suggestions.
 * Used by the autocomplete handler, no rate throttle since Discord
 * already debounces keystrokes.
 */
export async function searchNominatim(
  query: string
): Promise<{ name: string; lat: number; lon: number }[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AllMySat-Discord-Bot/1.0" },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];

    return data.map((d) => ({
      name: d.display_name.split(",").slice(0, 2).join(", "),
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
  } catch {
    return [];
  }
}
