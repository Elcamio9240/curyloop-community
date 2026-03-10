import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { groups, sessions, groupMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) notFound();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) notFound();

  const sessionList = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      status: sessions.status,
      weekNumber: sessions.weekNumber,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.groupId, groupId))
    .orderBy(desc(sessions.createdAt));

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{group.name}</h1>
            {group.description && (
              <p className="mt-1 text-sm text-zinc-500">{group.description}</p>
            )}
          </div>
          <Link
            href={`/groups/${groupId}/sessions/new`}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0258b8]"
          >
            <Plus className="h-4 w-4" />
            New Session
          </Link>
        </div>
      </div>

      {sessionList.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500">No sessions yet. Create one to start adding items.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessionList.map((s) => (
            <Link
              key={s.id}
              href={`/groups/${groupId}/sessions/${s.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
            >
              <div>
                <h3 className="font-medium text-zinc-900">{s.title}</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Week {s.weekNumber} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.status === "active"
                    ? "bg-green-50 text-green-700"
                    : s.status === "archived"
                      ? "bg-zinc-100 text-zinc-500"
                      : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
