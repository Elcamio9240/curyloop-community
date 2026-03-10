import { verifyApiKey } from "@/lib/api/auth";
import { corsResponse, corsOptionsResponse } from "@/lib/api/cors";
import { rateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: Request) {
  const { user, error } = await verifyApiKey(request);

  if (error || !user) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`ext-auth:${ip}`, 30, 60_000);
    if (!rl.success) {
      return corsResponse({ error: "Too many requests" }, 429);
    }
    return corsResponse({ error: error || "Unauthorized" }, 401);
  }

  return corsResponse({
    user: { id: user.id, email: user.email },
  });
}
