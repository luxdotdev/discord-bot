import type { Client } from "discord.js";
import { logger } from "../utils/logger.ts";
import { verifyBotSecret } from "./middleware/auth.ts";
import { getGuildChannels, getGuilds } from "./routes/guilds.ts";
import {
  sendNotification,
  type NotificationPayload,
} from "./routes/notifications.ts";

export function startServer(client: Client, port: number) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const startTime = Date.now();
      const url = new URL(req.url);
      const event: Record<string, unknown> = {
        type: "http_request",
        method: req.method,
        path: url.pathname,
      };

      try {
        if (url.pathname === "/health") {
          event.outcome = "success";
          event.status_code = 200;
          return Response.json({ status: "ok" });
        }

        if (!verifyBotSecret(req)) {
          event.outcome = "unauthorized";
          event.status_code = 401;
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (req.method === "GET" && url.pathname === "/api/guilds") {
          const guilds = getGuilds(client);
          event.outcome = "success";
          event.status_code = 200;
          event.guild_count = guilds.length;
          return Response.json(guilds);
        }

        const channelsMatch = url.pathname.match(
          /^\/api\/guilds\/(\d+)\/channels$/,
        );
        if (req.method === "GET" && channelsMatch) {
          const guildId = channelsMatch[1];
          const channels = getGuildChannels(client, guildId);
          event.outcome = "success";
          event.status_code = 200;
          event.guild_id = guildId;
          event.channel_count = channels.length;
          return Response.json(channels);
        }

        if (
          req.method === "POST" &&
          url.pathname === "/api/notifications/send"
        ) {
          const body: NotificationPayload = await req.json();
          event.guild_id = body.guildId;
          event.channel_id = body.channelId;
          event.notification_event = body.event;
          event.team_id = body.data.teamId;

          await sendNotification(client, body);

          event.outcome = "success";
          event.status_code = 200;
          return Response.json({ success: true });
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

  logger.info({ type: "server_start", port: server.port });

  return server;
}
