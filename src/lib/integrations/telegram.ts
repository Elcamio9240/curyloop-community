import type {
  IntegrationProvider,
  NotificationPayload,
  DigestPayload,
} from "./types";

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: `Telegram returned ${res.status}: ${(body as { description?: string }).description || "Unknown error"}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const telegramProvider: IntegrationProvider = {
  async sendNotification(config, payload: NotificationPayload) {
    const text = [
      `*New item added*`,
      ``,
      `[${escapeMarkdownV2(payload.itemTitle)}](${payload.itemUrl})`,
      `Added by *${escapeMarkdownV2(payload.contributorName)}* to *${escapeMarkdownV2(payload.groupName)}* / ${escapeMarkdownV2(payload.sessionTitle)}`,
      ``,
      `[View Session](${payload.sessionUrl})`,
    ].join("\n");

    return sendTelegramMessage(config.bot_token, config.chat_id, text);
  },

  async sendDigest(config, payload: DigestPayload) {
    const itemLines = payload.items
      .map(
        (item, i) =>
          `${i + 1}\\. [${escapeMarkdownV2(item.title)}](${item.url}) \\- by ${escapeMarkdownV2(item.contributorName)}`
      )
      .join("\n");

    const count = payload.items.length;
    const text = [
      `*${escapeMarkdownV2(payload.groupName)} \\- ${escapeMarkdownV2(payload.sessionTitle)}*`,
      ``,
      `*${count} new item${count === 1 ? "" : "s"}* since last digest:`,
      ``,
      itemLines,
      ``,
      `[Open Session](${payload.sessionUrl})`,
    ].join("\n");

    return sendTelegramMessage(config.bot_token, config.chat_id, text);
  },

  async sendTestMessage(config) {
    const text = [
      `*Curyloop Connected*`,
      ``,
      `Your Telegram integration is configured correctly\\. You will receive notifications here based on your settings\\.`,
    ].join("\n");

    return sendTelegramMessage(config.bot_token, config.chat_id, text);
  },
};
