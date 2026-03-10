import type {
  IntegrationProvider,
  NotificationPayload,
  DigestPayload,
} from "./types";

async function sendDiscordWebhook(
  webhookUrl: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Discord returned ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const discordProvider: IntegrationProvider = {
  async sendNotification(config, payload: NotificationPayload) {
    return sendDiscordWebhook(config.webhook_url, {
      embeds: [
        {
          title: "New item added",
          color: 0x0a274e,
          fields: [
            {
              name: payload.itemTitle,
              value: `[Open link](${payload.itemUrl})`,
            },
            {
              name: "Added by",
              value: payload.contributorName,
              inline: true,
            },
            {
              name: "Group",
              value: `${payload.groupName} / ${payload.sessionTitle}`,
              inline: true,
            },
          ],
          url: payload.sessionUrl,
        },
      ],
    });
  },

  async sendDigest(config, payload: DigestPayload) {
    const itemLines = payload.items
      .map(
        (item, i) =>
          `${i + 1}. [${item.title}](${item.url}) - by ${item.contributorName}`
      )
      .join("\n");

    return sendDiscordWebhook(config.webhook_url, {
      embeds: [
        {
          title: `${payload.groupName} - ${payload.sessionTitle}`,
          description: `**${payload.items.length} new item${payload.items.length === 1 ? "" : "s"}** since last digest:\n\n${itemLines}`,
          color: 0x0a274e,
          url: payload.sessionUrl,
        },
      ],
    });
  },

  async sendTestMessage(config) {
    return sendDiscordWebhook(config.webhook_url, {
      embeds: [
        {
          title: "Curyloop Connected",
          description:
            "Your Discord integration is configured correctly. You will receive notifications here based on your settings.",
          color: 0x22c55e,
        },
      ],
    });
  },
};
