import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import * as ready from "./events/ready.ts";
import * as interactionCreate from "./events/interactionCreate.ts";
import { verifySignature } from "./utils/webhook.ts";
import { loadKeyStore } from "./utils/key-store.ts";

// Load persisted guild keys before starting
await loadKeyStore();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(ready.name, (...args) => ready.execute(...(args as [any])));
client.on(interactionCreate.name, (...args) =>
  interactionCreate.execute(...(args as [any]))
);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// --- Webhook server for scrim notifications ---

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const NOTIFICATION_CHANNEL_ID = process.env.NOTIFICATION_CHANNEL_ID;
const WEBHOOK_PORT = Number(process.env.PORT) || 3000;

type ScrimCreatedPayload = {
  type: "scrim.created";
  timestamp: string;
  teamId: number;
  data: {
    scrimName: string;
    scrimId: number;
    createdBy: string;
  };
};

const server = Bun.serve({
  port: WEBHOOK_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      const body = await req.text();
      const signature = req.headers.get("X-Webhook-Signature");

      if (!signature || !WEBHOOK_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }

      const payload: ScrimCreatedPayload = JSON.parse(body);

      if (payload.type === "scrim.created" && NOTIFICATION_CHANNEL_ID) {
        const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID);
        if (channel?.isTextBased() && "send" in channel) {
          const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("New Scrim Uploaded")
            .addFields(
              { name: "Scrim", value: payload.data.scrimName, inline: true },
              {
                name: "Uploaded by",
                value: payload.data.createdBy,
                inline: true,
              }
            )
            .setTimestamp(new Date(payload.timestamp));

          await channel.send({ embeds: [embed] });
        }
      }

      return Response.json({ received: true });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`Webhook server listening on port ${server.port}`);
