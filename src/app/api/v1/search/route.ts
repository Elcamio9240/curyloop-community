import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { searchUserItems } from "@/lib/search";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  if (!query) {
    return Response.json({ items: [] });
  }

  const items = await searchUserItems(session.user.id, query);
  return Response.json({ items });
}
