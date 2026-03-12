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

    const embed = brandEmbed(name)
      .setDescription(`${mapCount} maps played · ${heroesPlayed.length} heroes`)
      .addFields({
        name: "Heroes",
        value: heroesPlayed.join(", ") || "None",
        inline: false,
      });

    for (const [key, value] of Object.entries(aggregated ?? {})) {
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
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatStatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
