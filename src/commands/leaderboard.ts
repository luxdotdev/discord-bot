import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";

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
    opt.setName("hero").setDescription("Hero name").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName("limit")
      .setDescription("Number of entries (default 10)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const hero = interaction.options.getString("hero", true);
  const limit = interaction.options.getInteger("limit") ?? 10;

  try {
    const result = await apiGet<LeaderboardData>(
      `/api/bot/leaderboard?hero=${encodeURIComponent(hero)}&limit=${limit}`,
    );

    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const { data: lb } = result;
    const embed = brandEmbed(`${lb.hero} Leaderboard (${lb.role})`);

    for (const entry of lb.leaderboard) {
      embed.addFields({
        name: `#${entry.rank} ${entry.player_name}`,
        value: `${entry.composite_sr} CSR · ${entry.maps} maps · ${entry.minutes_played.toFixed(0)}min`,
        inline: true,
      });
    }

    if (lb.leaderboard.length === 0) {
      embed.setDescription("No leaderboard data found for this hero.");
    }

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({
      embeds: [errorEmbed("Something went wrong. Try again later.")],
    });
  }
}
