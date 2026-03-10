import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { isGroupMember } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, title, description } = await request.json();
  if (!groupId || !title?.trim()) {
    return Response.json({ error: "groupId and title are required" }, { status: 400 });
  }

  const isMember = await isGroupMember(groupId, session.user.id);
  if (!isMember) {
    return Response.json({ error: "Not a member of this group" }, { status: 403 });
  }

  const now = new Date();
  const weekNumber = Math.ceil(
    (now.getTime() - new Date("2024-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  const [newSession] = await db
    .insert(sessions)
    .values({
      groupId,
      title: title.trim(),
      description: description?.trim() || null,
      weekNumber,
      status: "active",
      createdBy: session.user.id,
    })
    .returning();

  return Response.json({ session: newSession });
}
