import { Events, MessageFlags, type Interaction } from "discord.js";
import * as setup from "../commands/setup.ts";
import * as leaderboard from "../commands/leaderboard.ts";
import * as team from "../commands/team.ts";
import * as profile from "../commands/profile.ts";
import * as compare from "../commands/compare.ts";
import { logger } from "../utils/logger.ts";

const commands = new Map<
  string,
  { execute: (interaction: any) => Promise<void> }
>();

commands.set(setup.data.name, setup);
commands.set(leaderboard.data.name, leaderboard);
commands.set(team.data.name, team);
commands.set(profile.data.name, profile);
commands.set(compare.data.name, compare);

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const startTime = Date.now();
  const event: Record<string, unknown> = {
    type: "command",
    command: interaction.commandName,
    user_id: interaction.user.id,
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
  };

  const command = commands.get(interaction.commandName);
  if (!command) {
    event.outcome = "unknown_command";
    event.duration_ms = Date.now() - startTime;
    logger.error(event);
    return;
  }

  try {
    await command.execute(interaction);
    event.outcome = "success";
  } catch (error) {
    event.outcome = "error";
    event.error =
      error instanceof Error
        ? { message: error.message, type: error.name }
        : { message: String(error) };

    const reply = {
      content: "Something went wrong. Try again later.",
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  } finally {
    event.duration_ms = Date.now() - startTime;
    if (event.outcome === "error") {
      logger.error(event);
    } else {
      logger.info(event);
    }
  }
}
