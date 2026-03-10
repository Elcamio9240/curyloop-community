import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export async function verifyApiKey(request: Request): Promise<{
  user: { id: string; email: string } | null;
  error: string | null;
}> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing Authorization header" };
  }

  const token = authHeader.slice(7);
  const keyHash = createHash("sha256").update(token).digest("hex");

  const result = await db
    .select({
      userId: apiKeys.userId,
      email: users.email,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (result.length === 0) {
    return { user: null, error: "Invalid API key" };
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.keyHash, keyHash));

  return {
    user: { id: result[0].userId, email: result[0].email },
    error: null,
  };
}
