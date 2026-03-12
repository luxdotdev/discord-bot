import { prisma } from "./db.ts";

export async function getApiKeyForGuild(
  guildId: string
): Promise<string | undefined> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  return config?.apiKey;
}

export async function setApiKeyForGuild(
  guildId: string,
  apiKey: string
): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: { apiKey },
    create: { guildId, apiKey },
  });
}

export async function removeApiKeyForGuild(
  guildId: string
): Promise<boolean> {
  try {
    await prisma.guildConfig.delete({ where: { guildId } });
    return true;
  } catch {
    return false;
  }
}
