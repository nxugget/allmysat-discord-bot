import "dotenv/config";

export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN as string,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID as string,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID as string | undefined,
  SUPABASE_URL: process.env.SUPABASE_URL as string,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
} as const;

export function validateEnv(): void {
  const missing: string[] = [];
  if (!env.DISCORD_TOKEN) missing.push("DISCORD_TOKEN");
  if (!env.DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
