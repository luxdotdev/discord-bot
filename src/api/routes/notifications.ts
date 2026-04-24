import { EmbedBuilder, type Client } from "discord.js";

type ScrimCreatedData = {
  scrimName: string;
  scrimId: number;
  createdBy: string;
  teamId: number;
};

type AvailabilityReminderData = {
  teamId: number;
  teamName: string;
  scheduleId: string;
  url: string;
  roleId?: string | null;
};

type ScrimNotification = {
  guildId: string;
  channelId: string;
  event: "scrim.created";
  data: ScrimCreatedData;
};

type AvailabilityReminderNotification = {
  guildId: string;
  channelId: string;
  event: "availability.reminder";
  data: AvailabilityReminderData;
};

export type NotificationPayload =
  | ScrimNotification
  | AvailabilityReminderNotification;

export async function sendNotification(
  client: Client,
  body: NotificationPayload,
) {
  const channel = await client.channels.fetch(body.channelId);
  if (!channel?.isTextBased() || !("send" in channel)) {
    throw new Error("Channel not found or not text-based");
  }

  if (body.event === "scrim.created") {
    const embed = new EmbedBuilder()
      .setTitle("New Scrim Created")
      .setDescription(
        `**${body.data.scrimName}** was created by ${body.data.createdBy}`,
      )
      .setColor(0x0ea5e9)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    return;
  }

  if (body.event === "availability.reminder") {
    const roleId = body.data.roleId ?? null;
    const embed = new EmbedBuilder()
      .setTitle(`${body.data.teamName} — set your availability`)
      .setDescription(
        `Fill in your availability for this week:\n${body.data.url}`,
      )
      .setColor(0x10b981)
      .setTimestamp();
    await channel.send({
      content: roleId ? `<@&${roleId}>` : undefined,
      embeds: [embed],
      allowedMentions: roleId
        ? { roles: [roleId] }
        : { parse: [] },
    });
    return;
  }

  throw new Error(`Unknown notification event`);
}
