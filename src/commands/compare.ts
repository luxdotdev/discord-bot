import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { apiGet } from "../utils/api.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";
import { tracedDeferReply, tracedEditReply } from "../utils/interaction.ts";

type CompareData = {
  player1: { name: string; stats: Record<string, unknown> };
  player2: { name: string; stats: Record<string, unknown> };
};

export const data = new SlashCommandBuilder()
  .setName("compare")
  .setDescription("Compare two players")
  .addStringOption((opt) =>
    opt
      .setName("player1")
      .setDescription("First player name")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("player2")
      .setDescription("Second player name")
      .setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName("team_id")
      .setDescription("Team ID (defaults to your first team)")
      .setRequired(false)
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
    const embed = brandEmbed(`${p1.name} vs ${p2.name}`);

    const s1 = p1.stats ?? {};
    const s2 = p2.stats ?? {};
    const allKeys = new Set([
      ...Object.keys(s1),
      ...Object.keys(s2),
    ]);

    for (const key of allKeys) {
      embed.addFields({
        name: key,
        value: `${p1.name}: ${s1[key] ?? "—"}\n${p2.name}: ${s2[key] ?? "—"}`,
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
