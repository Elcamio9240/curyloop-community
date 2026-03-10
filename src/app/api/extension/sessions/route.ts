import { verifyApiKey } from "@/lib/api/auth";
import { corsResponse, corsOptionsResponse } from "@/lib/api/cors";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { groupMembers, sessions, groups } from "@/lib/db/schema";
import { eq, inArray, or, and, desc } from "drizzle-orm";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: Request) {
  const { user, error } = await verifyApiKey(request);

  if (error || !user) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`ext-sessions:${ip}`, 30, 60_000);
    if (!rl.success) {
      return corsResponse({ error: "Too many requests" }, 429);
    }
    return corsResponse({ error: error || "Unauthorized" }, 401);
  }

  const memberships = await db
    .select({
      groupId: groupMembers.groupId,
      groupName: groups.name,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, user.id));

  if (memberships.length === 0) {
    return corsResponse({ sessions: [] });
  }

  const groupIds = memberships.map((m) => m.groupId);
  const groupNameMap = new Map(memberships.map((m) => [m.groupId, m.groupName]));

  const sessionList = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      status: sessions.status,
      groupId: sessions.groupId,
    })
    .from(sessions)
    .where(
      and(
        inArray(sessions.groupId, groupIds),
        or(eq(sessions.status, "active"), eq(sessions.status, "draft"))
      )
    )
    .orderBy(desc(sessions.createdAt));

  return corsResponse({
    sessions: sessionList.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      groupId: s.groupId,
      groupName: groupNameMap.get(s.groupId) || "Unknown",
    })),
  });
}
