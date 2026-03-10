import type { ParseResult, ParsedImportItem } from "../types";
import { parseCSVRows } from "./generic";

export function parseRaindrop(text: string): ParseResult {
  const { headers, rows } = parseCSVRows(text);

  const colIdx = (names: string[]) => {
    const lower = headers.map((h) => h.toLowerCase().trim());
    for (const n of names) {
      const idx = lower.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const urlIdx = colIdx(["url", "link"]);
  const titleIdx = colIdx(["title", "name"]);
  const noteIdx = colIdx(["note", "excerpt", "description"]);
  const tagsIdx = colIdx(["tags"]);
  const folderIdx = colIdx(["folder", "collection"]);
  const createdIdx = colIdx(["created", "created_at"]);

  const folders = new Set<string>();
  const items: ParsedImportItem[] = [];

  for (const cols of rows) {
    const url = cols[urlIdx]?.trim();
    const title = cols[titleIdx]?.trim();
    if (!url || !title) continue;

    try {
      new URL(url);
    } catch {
      continue;
    }

    const folder = folderIdx >= 0 ? cols[folderIdx]?.trim() : undefined;
    if (folder) folders.add(folder);

    const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx]?.trim() : undefined;
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    let createdAt: string | undefined;
    if (createdIdx >= 0 && cols[createdIdx]?.trim()) {
      const raw = cols[createdIdx].trim();
      const d = new Date(raw);
      if (!isNaN(d.getTime())) createdAt = d.toISOString();
    }

    items.push({
      url,
      title,
      note: noteIdx >= 0 ? cols[noteIdx]?.trim() || undefined : undefined,
      tags,
      folder: folder || undefined,
      createdAt,
    });
  }

  return {
    source: "raindrop",
    items,
    folders: [...folders],
  };
}
