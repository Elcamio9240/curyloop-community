"use client";

import { useState } from "react";
import { Upload, Check } from "lucide-react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState("");

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !sessionId || !groupId) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);
      formData.append("groupId", groupId);

      const res = await fetch("/api/v1/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult({ imported: data.imported });
      }
    } catch {
      setError("Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Import</h1>

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        <p>Supported formats:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Browser bookmarks (HTML)</li>
          <li>Pocket export (HTML)</li>
          <li>Raindrop.io (CSV)</li>
          <li>Notion (CSV)</li>
          <li>Generic (JSON/CSV with url + title columns)</li>
        </ul>
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {result && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            <Check className="h-4 w-4" />
            Successfully imported {result.imported} items
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700">File</label>
          <div className="mt-1">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 p-4 hover:border-zinc-400">
              <Upload className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-500">
                {file ? file.name : "Choose file..."}
              </span>
              <input
                type="file"
                accept=".html,.htm,.csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Group ID</label>
          <input
            type="text"
            required
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400"
            placeholder="Group ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Session ID</label>
          <input
            type="text"
            required
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400"
            placeholder="Session ID"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[#0258b8] disabled:opacity-50"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </form>
    </div>
  );
}
