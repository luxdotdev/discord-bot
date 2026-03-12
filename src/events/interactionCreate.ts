import { Events, type Interaction } from "discord.js";
import * as setup from "../commands/setup.ts";
import * as leaderboard from "../commands/leaderboard.ts";
import * as team from "../commands/team.ts";
import * as profile from "../commands/profile.ts";
import * as compare from "../commands/compare.ts";

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

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const reply = {
      content: "Something went wrong. Try again later.",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
