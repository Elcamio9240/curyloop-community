import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return result.length > 0;
}

export async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId)
      )
    )
    .limit(1);
  if (result.length === 0) return false;

  const member = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return member[0]?.role === "admin" || member[0]?.role === "owner";
}

export async function isGroupOwner(groupId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return result[0]?.role === "owner";
}

export async function getUserRole(groupId: string, userId: string): Promise<string | null> {
  const result = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return result[0]?.role ?? null;
}
