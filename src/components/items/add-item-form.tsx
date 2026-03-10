"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function AddItemForm({ sessionId, groupId }: { sessionId: string; groupId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);

    try {
      await fetch("/api/v1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, url }),
      });
      setUrl("");
      router.refresh();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
        placeholder="Paste URL to add..."
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[#0258b8] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
