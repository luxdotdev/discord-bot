import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";

type MapWinrate = {
  totalWins: number;
  totalLosses: number;
  totalWinrate: number;
};

type TeamData = {
  team: { name: string; memberCount: number };
  winrates: {
    overallWins: number;
    overallLosses: number;
    overallWinrate: number;
    byMap: Record<string, MapWinrate>;
  };
};

export const data = new SlashCommandBuilder()
  .setName("team")
  .setDescription("View team winrates and stats")
  .addIntegerOption((opt) =>
    opt.setName("team_id").setDescription("Team ID").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const teamId = interaction.options.getInteger("team_id", true);

  try {
    const result = await apiGet<TeamData>(
      `/api/bot/team?teamId=${teamId}`,
      interaction.user.id,
    );

    if (!result.success) {
      await interaction.editReply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const { team, winrates } = result.data;
    const embed = brandEmbed(team.name)
      .setDescription(`${team.memberCount} members`)
      .addFields(
        {
          name: "Overall Record",
          value: `${winrates.overallWins}W - ${winrates.overallLosses}L (${winrates.overallWinrate}%)`,
          inline: false,
        }
      );

    const mapEntries = Object.entries(winrates.byMap);
    if (mapEntries.length > 0) {
      const mapLines = mapEntries
        .sort((a, b) => b[1].totalWinrate - a[1].totalWinrate)
        .map(
          ([map, wr]) =>
            `**${map}**: ${wr.totalWins}W-${wr.totalLosses}L (${wr.totalWinrate}%)`
        )
        .join("\n");

      embed.addFields({ name: "By Map", value: mapLines, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({
      embeds: [errorEmbed("Something went wrong. Try again later.")],
    });
  }
}
