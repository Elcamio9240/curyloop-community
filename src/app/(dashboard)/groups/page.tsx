import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users, Globe, Lock } from "lucide-react";

export default async function GroupsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const memberships = await db
    .select({
      groupId: groupMembers.groupId,
      role: groupMembers.role,
      name: groups.name,
      description: groups.description,
      visibility: groups.visibility,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Groups</h1>
        <Link
          href="/groups/new"
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0258b8]"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500">No groups yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <Link
              key={m.groupId}
              href={`/groups/${m.groupId}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-zinc-900">{m.name}</h3>
                {m.visibility === "public" ? (
                  <Globe className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Lock className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              {m.description && (
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{m.description}</p>
              )}
              <p className="mt-2 text-xs text-zinc-400 capitalize">{m.role}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
