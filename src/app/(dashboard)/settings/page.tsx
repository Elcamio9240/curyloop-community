import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { CloudCta } from "@/components/cloud-cta";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Profile</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="space-y-2 text-sm">
            <p><span className="text-zinc-500">Name:</span> <span className="text-zinc-900">{session.user.name || "—"}</span></p>
            <p><span className="text-zinc-500">Email:</span> <span className="text-zinc-900">{session.user.email}</span></p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">API Keys</h2>
        <ApiKeyManager initialKeys={keys} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Cloud Features</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          <p>Want OAuth login (Google, GitHub), push notifications, email digests, and analytics?</p>
          <a
            href="https://curyloop.com?ref=community-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[var(--color-brand)] hover:text-[#0258b8]"
          >
            Try Curyloop Cloud →
          </a>
        </div>
      </section>
    </div>
  );
}
