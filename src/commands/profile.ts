import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";

type ProfileData = {
  playerName: string;
  teamName: string;
  stats: Record<string, unknown>;
};

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View a player profile with aggregated stats")
  .addStringOption((opt) =>
    opt
      .setName("player")
      .setDescription("In-game player name")
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName("team_id")
      .setDescription("Team ID (defaults to your first team)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const playerName = interaction.options.getString("player", true);
  const teamId = interaction.options.getInteger("team_id");

  const params = new URLSearchParams({
    playerName,
  });
  if (teamId) params.set("teamId", String(teamId));

  try {
    const result = await apiGet<ProfileData>(
      interaction.guildId!,
      `/api/bot/profile?${params}`,
      interaction.user.id
    );

    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const { playerName: name, teamName, stats } = result.data;
    const embed = brandEmbed(name).setDescription(`Team: ${teamName}`);

    for (const [key, value] of Object.entries(stats)) {
      embed.addFields({
        name: key,
        value: String(value),
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({
      embeds: [errorEmbed("Something went wrong. Try again later.")],
    });
  }
}
