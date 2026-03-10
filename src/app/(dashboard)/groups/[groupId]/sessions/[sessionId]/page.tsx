import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sessions, items, users, groupMembers, tags, itemTags } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AddItemForm } from "@/components/items/add-item-form";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const { groupId, sessionId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) notFound();

  const [sess] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.groupId, groupId)))
    .limit(1);

  if (!sess) notFound();

  const itemList = await db
    .select({
      id: items.id,
      url: items.url,
      title: items.title,
      description: items.description,
      domain: items.domain,
      ogImage: items.ogImage,
      priority: items.priority,
      discussed: items.discussed,
      createdAt: items.createdAt,
      contributorName: users.name,
      contributorEmail: users.email,
    })
    .from(items)
    .leftJoin(users, eq(items.contributorId, users.id))
    .where(eq(items.sessionId, sessionId))
    .orderBy(desc(items.createdAt));

  // Get tags for items
  const itemIds = itemList.map((i) => i.id);
  const tagData = itemIds.length > 0
    ? await db
        .select({ itemId: itemTags.itemId, tagName: tags.name })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(inArray(itemTags.itemId, itemIds))
    : [];

  const tagMap = new Map<string, string[]>();
  for (const t of tagData) {
    if (!tagMap.has(t.itemId)) tagMap.set(t.itemId, []);
    tagMap.get(t.itemId)!.push(t.tagName);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{sess.title}</h1>
        {sess.description && (
          <p className="mt-1 text-sm text-zinc-500">{sess.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
          <span>Week {sess.weekNumber}</span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${
            sess.status === "active" ? "bg-green-50 text-green-700" :
            sess.status === "archived" ? "bg-zinc-100 text-zinc-500" :
            "bg-yellow-50 text-yellow-700"
          }`}>{sess.status}</span>
        </div>
      </div>

      <AddItemForm sessionId={sessionId} groupId={groupId} />

      <div className="mt-6 space-y-3">
        {itemList.map((item) => (
          <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-zinc-900 truncate">
                    {item.title || item.url}
                  </h3>
                  {item.priority !== "medium" && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      item.priority === "high" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-500"
                    }`}>{item.priority}</span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span>{item.domain}</span>
                  <span>·</span>
                  <span>{item.contributorName || item.contributorEmail}</span>
                  {tagMap.get(item.id)?.map((tag) => (
                    <span key={tag} className="rounded bg-[var(--color-brand-light)] px-1.5 py-0.5 text-[var(--color-brand)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 shrink-0 text-zinc-400 hover:text-zinc-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}

        {itemList.length === 0 && (
          <p className="text-center text-sm text-zinc-400 py-8">
            No items yet. Add a URL above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
