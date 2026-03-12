import { EmbedBuilder, type Client } from "discord.js";

type NotificationPayload = {
  guildId: string;
  channelId: string;
  event: string;
  data: {
    scrimName: string;
    scrimId: number;
    createdBy: string;
    teamId: number;
  };
};

export { type NotificationPayload };

export async function sendNotification(
  client: Client,
  body: NotificationPayload,
) {
  const channel = await client.channels.fetch(body.channelId);
  if (!channel?.isTextBased() || !("send" in channel)) {
    throw new Error("Channel not found or not text-based");
  }

  const embed = new EmbedBuilder()
    .setTitle("New Scrim Created")
    .setDescription(
      `**${body.data.scrimName}** was created by ${body.data.createdBy}`,
    )
    .setColor(0x0ea5e9)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
