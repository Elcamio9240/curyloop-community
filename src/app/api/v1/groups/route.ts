import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    .where(eq(groupMembers.userId, session.user.id));

  return Response.json({
    groups: memberships.map((m) => ({
      id: m.groupId,
      name: m.name,
      description: m.description,
      visibility: m.visibility,
      role: m.role,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, visibility } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [group] = await db
    .insert(groups)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      visibility: visibility || "private",
      createdBy: session.user.id,
    })
    .returning();

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: session.user.id,
    role: "owner",
  });

  return Response.json({ group });
}
