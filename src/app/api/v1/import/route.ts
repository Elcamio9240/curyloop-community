import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { items, tags, itemTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGroupMember } from "@/lib/auth/permissions";
import { detectSource } from "@/lib/import/detect-source";
import { parseRaindrop } from "@/lib/import/parsers/raindrop";
import { parseNotion } from "@/lib/import/parsers/notion";
import { parseGenericCSV, parseGenericJSON } from "@/lib/import/parsers/generic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("sessionId") as string;
  const groupId = formData.get("groupId") as string;

  if (!file || !sessionId || !groupId) {
    return Response.json({ error: "file, sessionId, and groupId are required" }, { status: 400 });
  }

  const isMember = await isGroupMember(groupId, session.user.id);
  if (!isMember) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const text = await file.text();
  const source = detectSource(text, file.name);

  if (!source) {
    return Response.json({ error: "Unsupported file format" }, { status: 400 });
  }

  let parsed;
  switch (source) {
    case "browser":
    case "pocket":
      // These use DOMParser which is browser-only, handle server-side with regex
      parsed = parseServerSideHtml(text, source);
      break;
    case "raindrop":
      parsed = parseRaindrop(text);
      break;
    case "notion":
      parsed = parseNotion(text);
      break;
    case "generic":
      parsed = file.name.endsWith(".json")
        ? parseGenericJSON(text)
        : parseGenericCSV(text);
      break;
  }

  let imported = 0;
  for (const item of parsed.items) {
    try {
      let domain: string | null = null;
      try {
        domain = new URL(item.url).hostname.replace("www.", "");
      } catch { continue; }

      const [newItem] = await db
        .insert(items)
        .values({
          sessionId,
          url: item.url,
          title: item.title,
          description: item.description || null,
          domain,
          contributorId: session.user.id,
        })
        .returning({ id: items.id });

      if (newItem && item.tags?.length) {
        for (const tagName of item.tags) {
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
            .values({ itemId: newItem.id, tagId })
            .onConflictDoNothing();
        }
      }

      imported++;
    } catch {
      continue;
    }
  }

  return Response.json({ imported, total: parsed.items.length, source });
}

// Server-side HTML parser for browser bookmarks and Pocket exports
function parseServerSideHtml(html: string, source: "browser" | "pocket") {
  const items: { url: string; title: string; description?: string; tags?: string[] }[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].replace(/<[^>]*>/g, "").trim();
    if (!url || !title) continue;
    if (url.startsWith("javascript:") || url.startsWith("place:")) continue;

    try {
      new URL(url);
    } catch {
      continue;
    }

    let itemTags: string[] | undefined;
    if (source === "pocket") {
      const tagMatch = match[0].match(/tags=["']([^"']+)["']/i);
      if (tagMatch) {
        itemTags = tagMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    items.push({ url, title, tags: itemTags });
  }

  return { source, items, folders: [] };
}
