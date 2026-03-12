import { Collection } from "discord.js";
import { existsSync } from "fs";

const STORE_PATH = process.env.KEY_STORE_PATH || "./guild-keys.json";

// In-memory cache backed by a JSON file
const guildKeys = new Collection<string, string>();

export function getApiKeyForGuild(guildId: string): string | undefined {
  return guildKeys.get(guildId);
}

export function setApiKeyForGuild(guildId: string, apiKey: string): void {
  guildKeys.set(guildId, apiKey);
  persist();
}

export function removeApiKeyForGuild(guildId: string): boolean {
  const deleted = guildKeys.delete(guildId);
  if (deleted) persist();
  return deleted;
}

function persist(): void {
  const data = Object.fromEntries(guildKeys);
  Bun.write(STORE_PATH, JSON.stringify(data, null, 2));
}

export async function loadKeyStore(): Promise<void> {
  if (!existsSync(STORE_PATH)) return;

  const raw = await Bun.file(STORE_PATH).text();
  const data: Record<string, string> = JSON.parse(raw);
  for (const [guildId, apiKey] of Object.entries(data)) {
    guildKeys.set(guildId, apiKey);
  }
  console.log(`Loaded ${guildKeys.size} guild key(s) from store`);
}
