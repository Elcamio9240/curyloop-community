import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { collections, groupMembers, groups } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { FolderOpen } from "lucide-react";

export default async function CollectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);

  const collectionList = groupIds.length > 0
    ? await db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          groupId: collections.groupId,
          groupName: groups.name,
        })
        .from(collections)
        .innerJoin(groups, eq(collections.groupId, groups.id))
        .where(inArray(collections.groupId, groupIds))
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Collections</h1>

      {collectionList.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-8 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500">
            No collections yet. Collections help you curate items across sessions.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {collectionList.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="font-medium text-zinc-900">{c.name}</h3>
              {c.description && (
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{c.description}</p>
              )}
              <p className="mt-2 text-xs text-zinc-400">{c.groupName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
