/** Color used for all Discord embed sidebars. */
export const EMBED_COLOR = 0x6c42d6;

/** Prediction window: 48 hours in milliseconds. */
export const PASSES_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Time step between propagation samples: 1 minute. */
export const PASSES_STEP_MS = 60_000;

/** Maximum number of passes to compute before stopping early. */
export const PASSES_MAX_COUNT = 15;

/** Maximum passes shown in a Discord embed (Discord field limit). */
export const PASSES_DISPLAY_LIMIT = 10;

/** Minimum delay between Nominatim geocoding requests (1.1 s). */
export const GEOCODE_THROTTLE_MS = 1100;
