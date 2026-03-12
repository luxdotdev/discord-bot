import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type LeaderboardEntry = {
  player_name: string;
  composite_sr: number;
  rank: number;
  percentile: string;
  maps: number;
  minutes_played: number;
};

type LeaderboardData = {
  hero: string;
  role: string;
  leaderboard: LeaderboardEntry[];
};

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View hero leaderboard")
  .addStringOption((opt) =>
    opt.setName("hero").setDescription("Hero name").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("limit")
      .setDescription("Number of entries (default 10)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const hero = interaction.options.getString("hero", true);
  const limit = interaction.options.getInteger("limit") ?? 10;

  try {
    const result = await apiGet<LeaderboardData>(
      `/api/bot/leaderboard?hero=${encodeURIComponent(hero)}&limit=${limit}`,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { data: lb } = result;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.leaderboard.hero": lb.hero,
        "command.leaderboard.role": lb.role,
        "command.leaderboard.entry_count": lb.leaderboard.length,
        "command.leaderboard.entries": JSON.stringify(lb.leaderboard),
        "command.leaderboard.requested_limit": limit,
        "command.leaderboard.api_success": true,
      });
    }

    const embed = brandEmbed(`${lb.hero} Leaderboard (${lb.role})`);

    for (const entry of lb.leaderboard) {
      embed.addFields({
        name: `#${entry.rank} ${entry.player_name}`,
        value: `${entry.composite_sr} CSR · ${entry.maps} maps · ${Math.round(Number(entry.minutes_played))}min`,
        inline: true,
      });
    }

    if (lb.leaderboard.length === 0) {
      embed.setDescription("No leaderboard data found for this hero.");
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
