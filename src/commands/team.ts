import { trace } from "@opentelemetry/api";
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

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
    opt.setName("team_id").setDescription("Team ID").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await tracedDeferReply(interaction);

  const teamId = interaction.options.getInteger("team_id", true);

  try {
    const result = await apiGet<TeamData>(
      `/api/bot/team?teamId=${teamId}`,
      interaction.user.id,
    );

    if (!result.success) {
      await tracedEditReply(interaction, {
        embeds: [errorEmbed(result.error)],
      });
      return;
    }

    const { team, winrates } = result.data;

    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        "command.team.team_id": teamId,
        "command.team.team_name": team.name,
        "command.team.member_count": team.memberCount,
        "command.team.overall_wins": winrates.overallWins,
        "command.team.overall_losses": winrates.overallLosses,
        "command.team.overall_winrate": winrates.overallWinrate,
        "command.team.map_count": Object.keys(winrates.byMap).length,
        "command.team.by_map": JSON.stringify(winrates.byMap),
        "command.team.api_success": true,
      });
    }

    const embed = brandEmbed(team.name)
      .setDescription(`${team.memberCount} members`)
      .addFields({
        name: "Overall Record",
        value: `${winrates.overallWins}W - ${winrates.overallLosses}L (${winrates.overallWinrate}%)`,
        inline: false,
      });

    const mapEntries = Object.entries(winrates.byMap);
    if (mapEntries.length > 0) {
      const mapLines = mapEntries
        .sort((a, b) => b[1].totalWinrate - a[1].totalWinrate)
        .map(
          ([map, wr]) =>
            `**${map}**: ${wr.totalWins}W-${wr.totalLosses}L (${wr.totalWinrate}%)`,
        )
        .join("\n");

      embed.addFields({ name: "By Map", value: mapLines, inline: false });
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
