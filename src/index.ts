import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import * as interactionCreate from "./events/interactionCreate.ts";
import * as ready from "./events/ready.ts";
import { logger } from "./utils/logger.ts";
import { verifySignature } from "./utils/webhook.ts";

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

// --- Webhook server for scrim notifications ---

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const NOTIFICATION_CHANNEL_ID = process.env.NOTIFICATION_CHANNEL_ID;
const WEBHOOK_PORT = Number(process.env.PORT) || 8080;

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
    const startTime = Date.now();
    const url = new URL(req.url);
    const event: Record<string, unknown> = {
      type: "webhook_request",
      method: req.method,
      path: url.pathname,
    };

    try {
      if (url.pathname === "/health") {
        event.outcome = "success";
        event.status_code = 200;
        return Response.json({ status: "ok" });
      }

      if (req.method === "POST" && url.pathname === "/webhook") {
        const body = await req.text();
        const signature = req.headers.get("X-Webhook-Signature");

        if (!signature || !WEBHOOK_SECRET) {
          event.outcome = "unauthorized";
          event.status_code = 401;
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
          event.outcome = "invalid_signature";
          event.status_code = 401;
          return Response.json(
            { error: "Invalid signature" },
            { status: 401 },
          );
        }

        const payload: ScrimCreatedPayload = JSON.parse(body);
        event.webhook_type = payload.type;
        event.team_id = payload.teamId;

        if (payload.type === "scrim.created" && NOTIFICATION_CHANNEL_ID) {
          const channel =
            await client.channels.fetch(NOTIFICATION_CHANNEL_ID);
          if (channel?.isTextBased() && "send" in channel) {
            const embed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("New Scrim Uploaded")
              .addFields(
                {
                  name: "Scrim",
                  value: payload.data.scrimName,
                  inline: true,
                },
                {
                  name: "Uploaded by",
                  value: payload.data.createdBy,
                  inline: true,
                },
              )
              .setTimestamp(new Date(payload.timestamp));

            await channel.send({ embeds: [embed] });
            event.notification_sent = true;
          } else {
            event.notification_sent = false;
          }
        }

        event.outcome = "success";
        event.status_code = 200;
        return Response.json({ received: true });
      }

      event.outcome = "not_found";
      event.status_code = 404;
      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      event.outcome = "error";
      event.status_code = 500;
      event.error =
        error instanceof Error
          ? { message: error.message, type: error.name }
          : { message: String(error) };
      return Response.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    } finally {
      event.duration_ms = Date.now() - startTime;
      if (event.outcome === "error") {
        logger.error(event);
      } else {
        logger.info(event);
      }
    }
  },
});

logger.info({
  type: "server_start",
  port: server.port,
});
