import { getSupabase } from "../lib/supabase.js";

export interface SatelliteInfo {
  norad_id: number;
  name: string;
  alternate_name: string | null;
  status: string | null;
  orbit: string | null;
  object_type: string | null;
  category: string | null;
  country: string[] | null;
  launch_date: string | null;
  launch_site: string | null;
}

/**
 * Look up a satellite by NORAD catalog number.
 * Returns `null` when no matching satellite is found in the database.
 */
export async function getSatelliteByNoradId(
  noradId: number
): Promise<SatelliteInfo | null> {
  const supabase = getSupabase();

  const { data: sat, error } = await supabase
    .from("satellites")
    .select(
      "norad_id, name, alternate_name, status, orbit, object_type, category, country, launch_date, launch_site"
    )
    .eq("norad_id", noradId)
    .maybeSingle();

  if (error || !sat) return null;

  return {
    norad_id: sat.norad_id,
    name: sat.name,
    alternate_name: sat.alternate_name,
    status: sat.status,
    orbit: sat.orbit,
    object_type: sat.object_type,
    category: sat.category,
    country: sat.country,
    launch_date: sat.launch_date,
    launch_site: sat.launch_site,
  };
}

/**
 * Search satellites by name or alternate name (case-insensitive).
 * Returns up to `limit` matches for autocomplete suggestions.
 */
export async function searchSatellites(
  query: string,
  limit = 25
): Promise<{ norad_id: number; name: string; alternate_name: string | null }[]> {
  const supabase = getSupabase();

  const safe = query.replace(/[%_\\,().]/g, "");
  if (safe.length === 0) return [];

  const pattern = `%${safe}%`;

  const { data, error } = await supabase
    .from("satellites")
    .select("norad_id, name, alternate_name")
    .or(`name.ilike.${pattern},alternate_name.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data as { norad_id: number; name: string; alternate_name: string | null }[];
}

/**
 * Look up a satellite by its exact name.
 * Searches both `name` and `alternate_name` columns.
 * Returns `null` when no match is found.
 */
export async function getSatelliteByName(
  name: string
): Promise<SatelliteInfo | null> {
  const supabase = getSupabase();
  const columns =
    "norad_id, name, alternate_name, status, orbit, object_type, category, country, launch_date, launch_site";

  const { data: sat, error } = await supabase
    .from("satellites")
    .select(columns)
    .eq("name", name)
    .maybeSingle();

  if (error) return null;
  if (sat) return mapToSatelliteInfo(sat);

  const { data: alt, error: altError } = await supabase
    .from("satellites")
    .select(columns)
    .eq("alternate_name", name)
    .maybeSingle();

  if (altError || !alt) return null;
  return mapToSatelliteInfo(alt);
}

interface SatelliteRow {
  norad_id: number;
  name: string;
  alternate_name: string | null;
  status: string | null;
  orbit: string | null;
  object_type: string | null;
  category: string | null;
  country: string[] | null;
  launch_date: string | null;
  launch_site: string | null;
}

function mapToSatelliteInfo(row: SatelliteRow): SatelliteInfo {
  return {
    norad_id: row.norad_id,
    name: row.name,
    alternate_name: row.alternate_name,
    status: row.status,
    orbit: row.orbit,
    object_type: row.object_type,
    category: row.category,
    country: row.country,
    launch_date: row.launch_date,
    launch_site: row.launch_site,
  };
}

export interface TleData {
  satelliteName: string;
  orbit: string | null;
  tle_line1: string;
  tle_line2: string;
}

/**
 * Fetch the latest TLE for a satellite by NORAD ID.
 * Returns `null` if the satellite is not found or has no TLE.
 */
export async function getTleByNoradId(
  noradId: number
): Promise<TleData | null> {
  const supabase = getSupabase();

  const { data: sat } = await supabase
    .from("satellites")
    .select("id, name, orbit")
    .eq("norad_id", noradId)
    .maybeSingle();

  if (!sat) return null;

  const { data: tle } = await supabase
    .from("tle")
    .select("tle_line1, tle_line2")
    .eq("satellite_id", sat.id)
    .maybeSingle();

  if (!tle) return null;

  return {
    satelliteName: sat.name,
    orbit: sat.orbit ?? null,
    tle_line1: tle.tle_line1,
    tle_line2: tle.tle_line2,
  };
}
