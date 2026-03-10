import { verifyApiKey } from "@/lib/api/auth";
import { corsResponse, corsOptionsResponse } from "@/lib/api/cors";
import { rateLimit } from "@/lib/rate-limit";
import { isSafeUrl } from "@/lib/utils/url";
import { db } from "@/lib/db";
import { items, tags, itemTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const { user, error } = await verifyApiKey(request);

  if (error || !user) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`ext-items:${ip}`, 20, 60_000);
    if (!rl.success) {
      return corsResponse({ error: "Too many requests" }, 429);
    }
    return corsResponse({ error: error || "Unauthorized" }, 401);
  }

  let body: {
    sessionId?: string;
    groupId?: string;
    url?: string;
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    tags?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { sessionId, groupId, url, title, description, priority, tags: tagNames } = body;

  if (!sessionId || !groupId || !url) {
    return corsResponse(
      { error: "sessionId, groupId, and url are required" },
      400
    );
  }

  try {
    new URL(url);
  } catch {
    return corsResponse({ error: "Invalid URL" }, 400);
  }

  let domain: string | null = null;
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    // ignore
  }

  let ogImage: string | null = null;
  let autoTitle = title || "";
  let autoDescription = description || null;

  try {
    const safe = await isSafeUrl(url);
    if (safe) {
      const metadata = await fetchUrlMetadata(url);
      if (metadata) {
        if (!title && metadata.title) autoTitle = metadata.title;
        if (!description && metadata.description) autoDescription = metadata.description;
        ogImage = metadata.ogImage;
      }
    }
  } catch {
    // best-effort
  }

  const [insertedItem] = await db
    .insert(items)
    .values({
      sessionId,
      url,
      title: autoTitle,
      description: autoDescription,
      ogImage,
      domain,
      priority: priority || "medium",
      contributorId: user.id,
    })
    .returning({ id: items.id });

  if (tagNames && tagNames.length > 0 && insertedItem) {
    for (const tagName of tagNames) {
      const name = tagName.toLowerCase().trim();
      if (!name) continue;

      const existing = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, name))
        .limit(1);

      let tagId: string;
      if (existing.length > 0) {
        tagId = existing[0].id;
      } else {
        const [newTag] = await db
          .insert(tags)
          .values({ name })
          .returning({ id: tags.id });
        tagId = newTag.id;
      }

      await db
        .insert(itemTags)
        .values({ itemId: insertedItem.id, tagId })
        .onConflictDoNothing();
    }
  }

  return corsResponse({ success: true });
}

async function fetchUrlMetadata(url: string): Promise<{
  title: string | null;
  description: string | null;
  ogImage: string | null;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Curyloop-Bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );

    return {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || null,
      ogImage: ogImageMatch?.[1]?.trim() || null,
    };
  } catch {
    return null;
  }
}
