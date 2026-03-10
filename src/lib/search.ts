import { db } from "./db";
import { items, sessions, groupMembers } from "./db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { searchItems as ftsSearch } from "./db/fts";

export async function searchUserItems(
  userId: string,
  query: string,
  groupIds?: string[]
) {
  // Get FTS results
  const ftsResults = ftsSearch(query);
  if (ftsResults.length === 0) return [];

  const itemIds = ftsResults.map(r => r.id);

  // Get user's groups if not specified
  let allowedGroupIds = groupIds;
  if (!allowedGroupIds) {
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    allowedGroupIds = memberships.map(m => m.groupId);
  }

  if (allowedGroupIds.length === 0) return [];

  // Get items that belong to user's groups
  const results = await db
    .select({
      id: items.id,
      url: items.url,
      title: items.title,
      description: items.description,
      domain: items.domain,
      priority: items.priority,
      sessionId: items.sessionId,
      createdAt: items.createdAt,
    })
    .from(items)
    .innerJoin(sessions, eq(items.sessionId, sessions.id))
    .where(
      and(
        inArray(items.id, itemIds),
        inArray(sessions.groupId, allowedGroupIds)
      )
    )
    .limit(20);

  // Sort by FTS rank
  const rankMap = new Map(ftsResults.map(r => [r.id, r.rank]));
  return results.sort((a, b) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0));
}
