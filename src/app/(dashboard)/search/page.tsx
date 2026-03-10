"use client";

import { useState } from "react";
import { Search as SearchIcon, ExternalLink } from "lucide-react";

type SearchResult = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  domain: string | null;
  priority: string;
  sessionId: string;
  createdAt: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Search</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            placeholder="Search items..."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[#0258b8] disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="space-y-3">
        {results.map((item) => (
          <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-zinc-900">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{item.description}</p>
                )}
                <p className="mt-1 text-xs text-zinc-400">{item.domain}</p>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 text-zinc-400 hover:text-zinc-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
        {results.length === 0 && query && !loading && (
          <p className="text-center text-sm text-zinc-400">No results found</p>
        )}
      </div>
    </div>
  );
}
