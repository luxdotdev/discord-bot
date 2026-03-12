import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type PlayerCompareData = {
  playerName: string;
  mapCount: number;
  aggregated: Record<string, number>;
};

type CompareData = {
  player1: PlayerCompareData;
  player2: PlayerCompareData;
};

// Stats most useful for a side-by-side comparison
const COMPARE_STATS = [
  "eliminationsPer10",
  "finalBlowsPer10",
  "deathsPer10",
  "heroDamagePer10",
  "healingDealtPer10",
  "damageTakenPer10",
  "damageBlockedPer10",
  "ultimatesEarnedPer10",
] as const;

export const data = new SlashCommandBuilder()
  .setName("compare")
  .setDescription("Compare two players")
  .addStringOption((opt) =>
    opt
      .setName("player1")
      .setDescription("First player name")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("player2")
      .setDescription("Second player name")
      .setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("team_id")
      .setDescription("Team ID (defaults to your first team)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const player1 = interaction.options.getString("player1", true);
  const player2 = interaction.options.getString("player2", true);
  const teamId = interaction.options.getInteger("team_id");

  const params = new URLSearchParams({ player1, player2 });
  if (teamId) params.set("teamId", String(teamId));

  try {
    const result = await apiGet<CompareData>(
      `/api/bot/compare?${params}`,
      interaction.user.id,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { player1: p1, player2: p2 } = result.data;
    const embed = brandEmbed(
      `${p1.playerName} vs ${p2.playerName}`,
    ).setDescription(`${p1.mapCount} maps vs ${p2.mapCount} maps`);

    const a1 = p1.aggregated ?? {};
    const a2 = p2.aggregated ?? {};

    for (const key of COMPARE_STATS) {
      const v1 = a1[key];
      const v2 = a2[key];
      if (v1 == null && v2 == null) continue;

      embed.addFields({
        name: formatStatName(key),
        value: `${p1.playerName}: ${formatStatValue(v1)}\n${p2.playerName}: ${formatStatValue(v2)}`,
        inline: true,
      });
    }

    await tracedEditReply(interaction, { embeds: [embed] });
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed("Something went wrong. Try again later.")],
      });
    }
    throw error;
  }
}

function formatStatName(key: string): string {
  return key
    .replace(/Per10$/, "/10min")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatStatValue(value: unknown): string {
  if (value == null) return "—";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1);
}
