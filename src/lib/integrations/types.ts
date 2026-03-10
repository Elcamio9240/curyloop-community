export type ProviderType = "slack" | "discord" | "teams" | "telegram";

export type NotificationPayload = {
  groupName: string;
  sessionTitle: string;
  itemTitle: string;
  itemUrl: string;
  contributorName: string;
  sessionUrl: string;
};

export type DigestPayload = {
  groupName: string;
  sessionTitle: string;
  items: { title: string; url: string; contributorName: string }[];
  sessionUrl: string;
};

export interface IntegrationProvider {
  sendNotification(
    config: Record<string, string>,
    payload: NotificationPayload
  ): Promise<{ ok: boolean; error?: string }>;

  sendDigest(
    config: Record<string, string>,
    payload: DigestPayload
  ): Promise<{ ok: boolean; error?: string }>;

  sendTestMessage(
    config: Record<string, string>
  ): Promise<{ ok: boolean; error?: string }>;
}
