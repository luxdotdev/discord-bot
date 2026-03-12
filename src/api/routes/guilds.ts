import { ChannelType, type Client } from "discord.js";

export function getGuilds(client: Client) {
  return client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
  }));
}

export function getGuildChannels(client: Client, guildId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return [];
  return guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText)
    .map((c) => ({ id: c.id, name: c.name, type: c.type }));
}
