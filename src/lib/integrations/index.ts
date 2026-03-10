import type { ProviderType, IntegrationProvider } from "./types";

export async function getProvider(
  type: ProviderType
): Promise<IntegrationProvider> {
  switch (type) {
    case "slack": {
      const { slackProvider } = await import("./slack");
      return slackProvider;
    }
    case "discord": {
      const { discordProvider } = await import("./discord");
      return discordProvider;
    }
    case "teams": {
      const { teamsProvider } = await import("./teams");
      return teamsProvider;
    }
    case "telegram": {
      const { telegramProvider } = await import("./telegram");
      return telegramProvider;
    }
  }
}

export type { ProviderType, IntegrationProvider } from "./types";
export type { NotificationPayload, DigestPayload } from "./types";
