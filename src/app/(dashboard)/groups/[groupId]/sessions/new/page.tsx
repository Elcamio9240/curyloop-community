"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function NewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, title, description }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        router.push(`/groups/${groupId}/sessions/${data.session.id}`);
      }
    } catch {
      setError("Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">New Session</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            placeholder="Week 42 Trends"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            placeholder="What are we curating this week?"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[#0258b8] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </form>
    </div>
  );
}
