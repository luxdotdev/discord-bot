import { SpanStatusCode, trace } from "@opentelemetry/api";
import { Events, MessageFlags, type Interaction } from "discord.js";
import * as compare from "../commands/compare.ts";
import * as leaderboard from "../commands/leaderboard.ts";
import * as profile from "../commands/profile.ts";
import * as team from "../commands/team.ts";
import { logger } from "../utils/logger.ts";

const tracer = trace.getTracer("discord-bot");

const commands = new Map<
  string,
  { execute: (interaction: any) => Promise<void> }
>();

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

  await tracer.startActiveSpan(
    `command.${interaction.commandName}`,
    async (span) => {
      span.setAttributes({
        "discord.command": interaction.commandName,
        "discord.user_id": interaction.user.id,
        "discord.guild_id": interaction.guildId ?? "",
        "discord.channel_id": interaction.channelId ?? "",
      });

      try {
        await command.execute(interaction);
        event.outcome = "success";
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        event.outcome = "error";
        event.error =
          error instanceof Error
            ? { message: error.message, type: error.name }
            : { message: String(error) };

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
          span.recordException(error);
        }

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "Something went wrong. Try again later.",
            flags: [MessageFlags.Ephemeral],
          });
        } else {
          await interaction.reply({
            content: "Something went wrong. Try again later.",
            flags: [MessageFlags.Ephemeral],
          });
        }
      } finally {
        event.duration_ms = Date.now() - startTime;
        if (event.outcome === "error") {
          logger.error(event);
        } else {
          logger.info(event);
        }
        span.end();
      }
    },
  );
}
