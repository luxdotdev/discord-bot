import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type ProfileData = {
  playerName: string;
  teamId: number;
  mapCount: number;
  heroesPlayed: string[];
  aggregated: Record<string, number>;
  trends: Record<string, number>;
};

const PROFILE_STATS = [
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
  .setName("profile")
  .setDescription("View a player profile with aggregated stats")
  .addStringOption((opt) =>
    opt
      .setName("player")
      .setDescription("In-game player name")
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

  const playerName = interaction.options.getString("player", true);
  const teamId = interaction.options.getInteger("team_id");

  const params = new URLSearchParams({ playerName });
  if (teamId) params.set("teamId", String(teamId));

  try {
    const result = await apiGet<ProfileData>(
      `/api/bot/profile?${params}`,
      interaction.user.id,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const {
      playerName: name,
      mapCount,
      heroesPlayed,
      aggregated,
    } = result.data;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.profile.player_name": name,
        "command.profile.team_id": result.data.teamId,
        "command.profile.map_count": mapCount,
        "command.profile.heroes_played": heroesPlayed.join(", "),
        "command.profile.heroes_count": heroesPlayed.length,
        "command.profile.aggregated": JSON.stringify(aggregated),
        "command.profile.trends": JSON.stringify(result.data.trends),
        "command.profile.api_success": true,
      });
    }

    const embed = brandEmbed(name)
      .setDescription(`${mapCount} maps played · ${heroesPlayed.length} heroes`)
      .addFields({
        name: "Heroes",
        value: heroesPlayed.join(", ") || "None",
        inline: false,
      });

    const stats = aggregated ?? {};
    for (const key of PROFILE_STATS) {
      const value = stats[key];
      if (value == null) continue;
      embed.addFields({
        name: formatStatName(key),
        value: formatStatValue(value),
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
  const num = Number(value);
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1);
}
