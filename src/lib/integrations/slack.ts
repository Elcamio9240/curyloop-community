import type {
  IntegrationProvider,
  NotificationPayload,
  DigestPayload,
} from "./types";

type SlackBlock =
  | {
      type: "header";
      text: { type: "plain_text"; text: string; emoji?: boolean };
    }
  | {
      type: "section";
      text: { type: "mrkdwn"; text: string };
      accessory?: {
        type: "button";
        text: { type: "plain_text"; text: string; emoji?: boolean };
        url: string;
      };
    }
  | { type: "divider" }
  | { type: "context"; elements: { type: "mrkdwn"; text: string }[] };

type SlackMessage = {
  text: string;
  blocks?: SlackBlock[];
};

async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Slack returned ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const slackProvider: IntegrationProvider = {
  async sendNotification(config, payload: NotificationPayload) {
    const message: SlackMessage = {
      text: `New item in ${payload.groupName} - ${payload.sessionTitle}: ${payload.itemTitle}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "New item added", emoji: true },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*<${payload.itemUrl}|${payload.itemTitle}>*\nAdded by *${payload.contributorName}* to *${payload.groupName}* / ${payload.sessionTitle}`,
          },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "View Session", emoji: true },
            url: payload.sessionUrl,
          },
        },
      ],
    };
    return sendSlackMessage(config.webhook_url, message);
  },

  async sendDigest(config, payload: DigestPayload) {
    const itemLines = payload.items
      .map(
        (item, i) =>
          `${i + 1}. <${item.url}|${item.title}> - by ${item.contributorName}`
      )
      .join("\n");

    const message: SlackMessage = {
      text: `${payload.items.length} new items in ${payload.groupName} - ${payload.sessionTitle}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${payload.groupName} - ${payload.sessionTitle}`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${payload.items.length} new item${payload.items.length === 1 ? "" : "s"}* since last digest:\n\n${itemLines}`,
          },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: " " },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "Open Session", emoji: true },
            url: payload.sessionUrl,
          },
        },
      ],
    };
    return sendSlackMessage(config.webhook_url, message);
  },

  async sendTestMessage(config) {
    return sendSlackMessage(config.webhook_url, {
      text: "Curyloop test message - your Slack integration is working!",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Curyloop Connected",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Your Slack integration is configured correctly. You will receive notifications here based on your settings.",
          },
        },
      ],
    });
  },
};
