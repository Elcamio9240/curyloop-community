import { verifyApiKey } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { groups, groupMembers, sessions, items, users } from "@/lib/db/schema";
import { eq, inArray, and, or, like, desc } from "drizzle-orm";
import { isSafeUrl } from "@/lib/utils/url";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
};

type ToolContext = {
  userId: string;
};

const TOOLS = [
  {
    name: "list_groups",
    description: "List all groups the authenticated user is a member of",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_sessions",
    description: "List sessions in a group. Returns active and draft sessions by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        groupId: { type: "string", description: "The group ID" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "list_items",
    description: "List all items in a session",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "add_item",
    description: "Add a new item (link/article/repo) to a session",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID" },
        groupId: { type: "string", description: "The group ID" },
        url: { type: "string", description: "URL of the item" },
        title: { type: "string", description: "Custom title (auto-extracted if omitted)" },
        description: { type: "string", description: "Notes about this item" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level (default: medium)" },
      },
      required: ["sessionId", "groupId", "url"],
    },
  },
  {
    name: "search_items",
    description: "Search items across all groups the user has access to",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

async function handleListGroups(ctx: ToolContext) {
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
    .where(eq(groupMembers.userId, ctx.userId));

  return JSON.stringify(
    memberships.map((m) => ({
      id: m.groupId,
      name: m.name,
      description: m.description,
      visibility: m.visibility,
      role: m.role,
    })),
    null,
    2
  );
}

async function handleListSessions(ctx: ToolContext, args: { groupId: string }) {
  const result = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      status: sessions.status,
      weekNumber: sessions.weekNumber,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.groupId, args.groupId),
        or(eq(sessions.status, "active"), eq(sessions.status, "draft"))
      )
    )
    .orderBy(desc(sessions.createdAt));

  return JSON.stringify(result, null, 2);
}

async function handleListItems(_ctx: ToolContext, args: { sessionId: string }) {
  const result = await db
    .select({
      id: items.id,
      url: items.url,
      title: items.title,
      description: items.description,
      domain: items.domain,
      priority: items.priority,
      ogImage: items.ogImage,
      createdAt: items.createdAt,
      contributorName: users.name,
      contributorEmail: users.email,
    })
    .from(items)
    .leftJoin(users, eq(items.contributorId, users.id))
    .where(eq(items.sessionId, args.sessionId))
    .orderBy(desc(items.createdAt));

  return JSON.stringify(
    result.map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title,
      description: r.description,
      domain: r.domain,
      priority: r.priority,
      ogImage: r.ogImage,
      createdAt: r.createdAt,
      contributor: { name: r.contributorName, email: r.contributorEmail },
    })),
    null,
    2
  );
}

async function handleAddItem(
  ctx: ToolContext,
  args: {
    sessionId: string;
    groupId: string;
    url: string;
    title?: string;
    description?: string;
    priority?: string;
  }
) {
  try {
    new URL(args.url);
  } catch {
    return "Error: Invalid URL";
  }

  const domain = new URL(args.url).hostname.replace("www.", "");

  let ogImage: string | null = null;
  let autoTitle = args.title || "";
  let autoDescription = args.description || null;

  try {
    const safe = await isSafeUrl(args.url);
    if (safe) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(args.url, {
        signal: controller.signal,
        headers: { "User-Agent": "Curyloop-Bot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
        );
        const ogMatch = html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        );
        if (!args.title && titleMatch?.[1]) autoTitle = titleMatch[1].trim();
        if (!args.description && descMatch?.[1])
          autoDescription = descMatch[1].trim();
        ogImage = ogMatch?.[1]?.trim() || null;
      }
    }
  } catch {
    // best-effort
  }

  await db.insert(items).values({
    sessionId: args.sessionId,
    url: args.url,
    title: autoTitle,
    description: autoDescription,
    ogImage,
    domain,
    priority: (args.priority as "low" | "medium" | "high") || "medium",
    contributorId: ctx.userId,
  });

  return `Item "${autoTitle || args.url}" added successfully.`;
}

async function handleSearchItems(ctx: ToolContext, args: { query: string }) {
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, ctx.userId));

  if (memberships.length === 0) return "[]";

  const groupIds = memberships.map((m) => m.groupId);

  const sessionList = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(inArray(sessions.groupId, groupIds));

  if (sessionList.length === 0) return "[]";

  const sessionIds = sessionList.map((s) => s.id);
  const q = `%${args.query}%`;

  const result = await db
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
    .where(
      and(
        inArray(items.sessionId, sessionIds),
        or(
          like(items.title, q),
          like(items.description, q),
          like(items.url, q),
          like(items.domain, q)
        )
      )
    )
    .orderBy(desc(items.createdAt))
    .limit(20);

  return JSON.stringify(result, null, 2);
}

async function callTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_groups":
      return handleListGroups(ctx);
    case "list_sessions":
      return handleListSessions(ctx, args as { groupId: string });
    case "list_items":
      return handleListItems(ctx, args as { sessionId: string });
    case "add_item":
      return handleAddItem(ctx, args as {
        sessionId: string;
        groupId: string;
        url: string;
        title?: string;
        description?: string;
        priority?: string;
      });
    case "search_items":
      return handleSearchItems(ctx, args as { query: string });
    default:
      return `Error: Unknown tool "${name}"`;
  }
}

function jsonRpc(id: string | number | undefined, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: string | number | undefined,
  code: number,
  message: string
) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleJsonRpc(
  msg: JsonRpcRequest,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  switch (msg.method) {
    case "initialize":
      return jsonRpc(msg.id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "Curyloop Community", version: "1.0.0" },
      });

    case "notifications/initialized":
      return jsonRpc(msg.id, {});

    case "tools/list":
      return jsonRpc(msg.id, { tools: TOOLS });

    case "tools/call": {
      const params = msg.params as {
        name: string;
        arguments?: Record<string, unknown>;
      };
      if (!params?.name) {
        return jsonRpcError(msg.id, -32602, "Missing tool name");
      }
      const text = await callTool(ctx, params.name, params.arguments || {});
      return jsonRpc(msg.id, {
        content: [{ type: "text", text }],
      });
    }

    default:
      return jsonRpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(request: Request) {
  const { user, error } = await verifyApiKey(request);
  if (error || !user) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: error || "Unauthorized" },
      },
      { status: 401 }
    );
  }

  const ctx: ToolContext = { userId: user.id };

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return Response.json(jsonRpcError(undefined, -32700, "Parse error"), {
      status: 400,
    });
  }

  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map((msg) => handleJsonRpc(msg, ctx))
    );
    return Response.json(results);
  }

  const result = await handleJsonRpc(body, ctx);
  return Response.json(result);
}

export async function GET() {
  return Response.json({
    name: "Curyloop Community MCP Server",
    version: "1.0.0",
    description:
      "MCP server for Curyloop Community. Use your API key as Bearer token to authenticate.",
    tools: TOOLS.map((t) => t.name),
  });
}
