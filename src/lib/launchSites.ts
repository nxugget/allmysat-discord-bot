import { getSupabase } from "./supabase.js";
import { logger } from "./logger.js";

const siteNames = new Map<string, string>();

let loaded = false;

/**
 * Load all launch site codes and names from Supabase into memory.
 * Called once at startup. Skipped if already loaded.
 */
export async function loadLaunchSites(): Promise<void> {
  if (loaded) return;

  const supabase = getSupabase();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("launch_sites")
      .select("code, name")
      .range(offset, offset + pageSize - 1);

    if (error) {
      logger.warn(`Failed to load launch sites: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.code && row.name) {
        siteNames.set(row.code.toUpperCase(), row.name);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  loaded = true;
  logger.info(`Launch sites loaded: ${siteNames.size}`);
}

/**
 * Resolve a launch site code to a human readable name.
 * Returns the raw code if no mapping is found.
 */
export function formatLaunchSite(code: string | null): string | null {
  if (!code) return null;
  const name = siteNames.get(code.toUpperCase());
  return name ?? code;
}

