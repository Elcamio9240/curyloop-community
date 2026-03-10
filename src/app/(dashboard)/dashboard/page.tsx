import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { groups, groupMembers, sessions, items } from "@/lib/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users, Bookmark, FolderOpen } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);

  const groupCount = groupIds.length;
  let sessionCount = 0;
  let itemCount = 0;

  if (groupIds.length > 0) {
    const [sc] = await db
      .select({ count: count() })
      .from(sessions)
      .where(inArray(sessions.groupId, groupIds));
    sessionCount = sc?.count ?? 0;

    const sessionList = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.groupId, groupIds));
    const sessionIds = sessionList.map((s) => s.id);

    if (sessionIds.length > 0) {
      const [ic] = await db
        .select({ count: count() })
        .from(items)
        .where(inArray(items.sessionId, sessionIds));
      itemCount = ic?.count ?? 0;
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <Link
          href="/groups/new"
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0258b8]"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Groups" value={groupCount} href="/groups" />
        <StatCard icon={FolderOpen} label="Sessions" value={sessionCount} />
        <StatCard icon={Bookmark} label="Items" value={itemCount} />
      </div>

      {groupCount === 0 && (
        <div className="mt-8 rounded-lg border border-zinc-200 p-8 text-center">
          <h2 className="text-lg font-medium text-zinc-900">Welcome to Curyloop!</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first group to start curating and sharing links with your team.
          </p>
          <Link
            href="/groups/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[#0258b8]"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-[var(--color-brand-light)] p-2">
          <Icon className="h-5 w-5 text-[var(--color-brand)]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900">{value}</p>
          <p className="text-sm text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
