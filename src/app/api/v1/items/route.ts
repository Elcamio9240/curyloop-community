import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { items, tags, itemTags, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGroupMember } from "@/lib/auth/permissions";
import { isSafeUrl } from "@/lib/utils/url";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, url, title, description, priority, tags: tagNames } = body;

  if (!sessionId || !url) {
    return Response.json({ error: "sessionId and url are required" }, { status: 400 });
  }

  const [sess] = await db
    .select({ groupId: sessions.groupId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sess) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const isMember = await isGroupMember(sess.groupId, session.user.id);
  if (!isMember) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  let domain: string | null = null;
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  let ogImage: string | null = null;
  let autoTitle = title || "";
  let autoDescription = description || null;

  try {
    if (await isSafeUrl(url)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Curyloop-Bot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (!title && titleMatch?.[1]) autoTitle = titleMatch[1].trim();
        if (!description && descMatch?.[1]) autoDescription = descMatch[1].trim();
        ogImage = ogMatch?.[1]?.trim() || null;
      }
    }
  } catch { /* best-effort */ }

  const [item] = await db
    .insert(items)
    .values({
      sessionId,
      url,
      title: autoTitle,
      description: autoDescription,
      ogImage,
      domain,
      priority: priority || "medium",
      contributorId: session.user.id,
    })
    .returning();

  if (tagNames?.length > 0 && item) {
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
        const [newTag] = await db.insert(tags).values({ name }).returning({ id: tags.id });
        tagId = newTag.id;
      }

      await db.insert(itemTags).values({ itemId: item.id, tagId }).onConflictDoNothing();
    }
  }

  return Response.json({ item });
}
