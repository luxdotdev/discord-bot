import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setApiKeyForGuild } from "../utils/key-store.ts";
import { brandEmbed, errorEmbed } from "../utils/embeds.ts";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Connect this server to Parsertime")
  .addStringOption((opt) =>
    opt
      .setName("api_key")
      .setDescription("Your Parsertime bot API key")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Respond ephemerally so the key isn't visible to others
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      embeds: [errorEmbed("This command can only be used in a server.")],
    });
    return;
  }

  const apiKey = interaction.options.getString("api_key", true);

  await setApiKeyForGuild(guildId, apiKey);

  await interaction.editReply({
    embeds: [
      brandEmbed("Setup Complete").setDescription(
        "This server is now connected to Parsertime. Members can use `/leaderboard`, `/team`, `/profile`, and `/compare`."
      ),
    ],
  });
}
