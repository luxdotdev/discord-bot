import { Client, GatewayIntentBits } from "discord.js";
import { startServer } from "./api/server.ts";
import * as interactionCreate from "./events/interactionCreate.ts";
import * as ready from "./events/ready.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(ready.name, (...args) => ready.execute(...(args as [any])));
client.on(interactionCreate.name, (...args) =>
  interactionCreate.execute(...(args as [any])),
);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Start HTTP server for Parsertime -> Bot communication
const port = Number(process.env.PORT) || 8080;
startServer(client, port);
