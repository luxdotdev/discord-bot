import { type Client, Events, REST, Routes } from "discord.js";
import * as setup from "../commands/setup.ts";
import * as leaderboard from "../commands/leaderboard.ts";
import * as team from "../commands/team.ts";
import * as profile from "../commands/profile.ts";
import * as compare from "../commands/compare.ts";

const commands = [setup, leaderboard, team, profile, compare];

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  const body = commands.map((cmd) => cmd.data.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body });

  console.log(`Registered ${body.length} slash commands`);
}
