import { db } from "@/lib/db";
import { webhookEndpoints, webhookDeliveries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "item.created"
  | "session.created"
  | "session.archived"
  | "agent.completed"
  | "agent.failed"
  | "member.joined";

export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.userId, userId),
        eq(webhookEndpoints.enabled, 1)
      )
    );

  if (endpoints.length === 0) return;

  const matchingEndpoints = endpoints.filter((ep) => {
    const events = JSON.parse(ep.events) as string[];
    return events.includes(event);
  });

  for (const endpoint of matchingEndpoints) {
    deliverWebhook(endpoint, event, payload).catch(() => {
      /* fire-and-forget */
    });
  }
}

async function deliverWebhook(
  endpoint: { id: string; url: string; secret: string },
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = createHmac("sha256", endpoint.secret)
    .update(body)
    .digest("hex");

  let statusCode: number | null = null;
  let responseBody: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    responseBody = await res.text().catch(() => null);
  } catch (err) {
    statusCode = 0;
    responseBody = err instanceof Error ? err.message : "Unknown error";
  }

  // Log delivery
  await db.insert(webhookDeliveries).values({
    endpointId: endpoint.id,
    event,
    payload: JSON.stringify(payload),
    statusCode,
    responseBody: responseBody?.slice(0, 1000) ?? null,
  });
}
