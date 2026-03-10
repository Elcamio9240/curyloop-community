import type {
  IntegrationProvider,
  NotificationPayload,
  DigestPayload,
} from "./types";

async function sendTeamsWebhook(
  webhookUrl: string,
  card: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: card,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Teams returned ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function adaptiveCard(
  body: Record<string, unknown>[],
  actions?: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body,
    ...(actions ? { actions } : {}),
  };
}

export const teamsProvider: IntegrationProvider = {
  async sendNotification(config, payload: NotificationPayload) {
    const card = adaptiveCard(
      [
        {
          type: "TextBlock",
          text: "New item added",
          weight: "Bolder",
          size: "Medium",
        },
        {
          type: "TextBlock",
          text: `**[${payload.itemTitle}](${payload.itemUrl})**`,
          wrap: true,
        },
        {
          type: "TextBlock",
          text: `Added by **${payload.contributorName}** to **${payload.groupName}** / ${payload.sessionTitle}`,
          wrap: true,
          size: "Small",
          color: "Default",
        },
      ],
      [
        {
          type: "Action.OpenUrl",
          title: "View Session",
          url: payload.sessionUrl,
        },
      ]
    );
    return sendTeamsWebhook(config.webhook_url, card);
  },

  async sendDigest(config, payload: DigestPayload) {
    const itemLines = payload.items
      .map(
        (item, i) =>
          `${i + 1}. [${item.title}](${item.url}) - by ${item.contributorName}`
      )
      .join("\n\n");

    const card = adaptiveCard(
      [
        {
          type: "TextBlock",
          text: `${payload.groupName} - ${payload.sessionTitle}`,
          weight: "Bolder",
          size: "Medium",
        },
        {
          type: "TextBlock",
          text: `**${payload.items.length} new item${payload.items.length === 1 ? "" : "s"}** since last digest:\n\n${itemLines}`,
          wrap: true,
        },
      ],
      [
        {
          type: "Action.OpenUrl",
          title: "Open Session",
          url: payload.sessionUrl,
        },
      ]
    );
    return sendTeamsWebhook(config.webhook_url, card);
  },

  async sendTestMessage(config) {
    const card = adaptiveCard([
      {
        type: "TextBlock",
        text: "Curyloop Connected",
        weight: "Bolder",
        size: "Medium",
        color: "Good",
      },
      {
        type: "TextBlock",
        text: "Your Microsoft Teams integration is configured correctly. You will receive notifications here based on your settings.",
        wrap: true,
      },
    ]);
    return sendTeamsWebhook(config.webhook_url, card);
  },
};
