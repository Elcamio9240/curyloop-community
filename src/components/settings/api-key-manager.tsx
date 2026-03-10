"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string | null;
};

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key);
        setKeys((prev) => [...prev, data.apiKey]);
        setNewKeyName("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-700">
            API key created! Copy it now — you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-1.5 text-xs font-mono text-zinc-900 border border-zinc-200">
              {newKey}
            </code>
            <button onClick={copyKey} className="text-zinc-500 hover:text-zinc-700">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400"
          placeholder="Key name (e.g., Browser Extension)"
        />
        <button
          onClick={createKey}
          disabled={creating || !newKeyName.trim()}
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[#0258b8] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">{key.name}</p>
              <p className="text-xs text-zinc-400">
                {key.keyPrefix}... · Created {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
              </p>
            </div>
            <button
              onClick={() => deleteKey(key.id)}
              className="text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-sm text-zinc-400">No API keys yet. Create one to use the browser extension or MCP.</p>
        )}
      </div>
    </div>
  );
}
