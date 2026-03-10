import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { items, sessions, groupMembers, tags, itemTags } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const scope = url.searchParams.get("scope") || "all";
  const scopeId = url.searchParams.get("id");

  const userId = session.user.id;

  // Get user's group IDs
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) {
    return format === "csv"
      ? new Response("url,title,description,tags\n", {
          headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=curyloop-export.csv" },
        })
      : Response.json([]);
  }

  let sessionFilter: string[] = [];

  if (scope === "session" && scopeId) {
    sessionFilter = [scopeId];
  } else if (scope === "group" && scopeId) {
    const groupSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.groupId, scopeId));
    sessionFilter = groupSessions.map((s) => s.id);
  } else {
    const allSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.groupId, groupIds));
    sessionFilter = allSessions.map((s) => s.id);
  }

  if (sessionFilter.length === 0) {
    return format === "csv"
      ? new Response("url,title,description,tags\n", {
          headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=curyloop-export.csv" },
        })
      : Response.json([]);
  }

  const exportItems = await db
    .select({
      url: items.url,
      title: items.title,
      description: items.description,
      domain: items.domain,
      priority: items.priority,
      createdAt: items.createdAt,
      id: items.id,
    })
    .from(items)
    .where(inArray(items.sessionId, sessionFilter));

  // Get tags for items
  const itemIds = exportItems.map((i) => i.id);
  const tagData = itemIds.length > 0
    ? await db
        .select({
          itemId: itemTags.itemId,
          tagName: tags.name,
        })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(inArray(itemTags.itemId, itemIds))
    : [];

  const tagMap = new Map<string, string[]>();
  for (const t of tagData) {
    if (!tagMap.has(t.itemId)) tagMap.set(t.itemId, []);
    tagMap.get(t.itemId)!.push(t.tagName);
  }

  const data = exportItems.map((i) => ({
    url: i.url,
    title: i.title,
    description: i.description || "",
    domain: i.domain || "",
    priority: i.priority,
    tags: tagMap.get(i.id) || [],
    createdAt: i.createdAt,
  }));

  if (format === "csv") {
    const csvLines = [
      "url,title,description,domain,priority,tags,created_at",
      ...data.map(
        (d) =>
          `"${d.url}","${(d.title || "").replace(/"/g, '""')}","${(d.description || "").replace(/"/g, '""')}","${d.domain}","${d.priority}","${d.tags.join(",")}","${d.createdAt}"`
      ),
    ];
    return new Response(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=curyloop-export.csv",
      },
    });
  }

  return Response.json(data, {
    headers: {
      "Content-Disposition": "attachment; filename=curyloop-export.json",
    },
  });
}
