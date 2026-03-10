import type { ParseResult, ParsedImportItem, ColumnMapping } from "../types";
import { parseCSVRows } from "./generic";

const URL_HINTS = ["url", "link", "href", "website", "address"];
const TITLE_HINTS = ["name", "title", "page", "label", "bookmark"];
const DESC_HINTS = ["description", "summary", "excerpt", "note", "notes"];
const TAG_HINTS = ["tags", "tag", "labels", "categories", "category", "type"];
const FOLDER_HINTS = ["folder", "collection", "group", "section", "database"];

function matchColumn(headers: string[], hints: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const idx = lower.indexOf(hint);
    if (idx >= 0) return headers[idx];
  }
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

export function autoMapColumns(headers: string[]): ColumnMapping | null {
  const url = matchColumn(headers, URL_HINTS);
  const title = matchColumn(headers, TITLE_HINTS);
  if (!url || !title) return null;
  return {
    url,
    title,
    description: matchColumn(headers, DESC_HINTS),
    tags: matchColumn(headers, TAG_HINTS),
    folder: matchColumn(headers, FOLDER_HINTS),
  };
}

export function parseNotion(
  text: string,
  mapping?: ColumnMapping
): ParseResult {
  const { headers, rows } = parseCSVRows(text);

  const effectiveMapping = mapping ?? autoMapColumns(headers);

  if (!effectiveMapping) {
    return {
      source: "notion",
      items: [],
      folders: [],
      columns: headers,
    };
  }

  const idx = (col: string | undefined) => {
    if (!col) return -1;
    return headers.findIndex(
      (h) => h.toLowerCase().trim() === col.toLowerCase().trim()
    );
  };

  const urlIdx = idx(effectiveMapping.url);
  const titleIdx = idx(effectiveMapping.title);
  const descIdx = idx(effectiveMapping.description);
  const tagsIdx = idx(effectiveMapping.tags);
  const folderIdx = idx(effectiveMapping.folder);
  const noteIdx = idx(effectiveMapping.note);

  if (urlIdx < 0 || titleIdx < 0) {
    return { source: "notion", items: [], folders: [], columns: headers };
  }

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

    let tags: string[] | undefined;
    if (tagsIdx >= 0 && cols[tagsIdx]?.trim()) {
      const raw = cols[tagsIdx].trim();
      if (raw.startsWith("[")) {
        try {
          tags = JSON.parse(raw);
        } catch {
          tags = raw.replace(/[[\]"]/g, "").split(",").map((t) => t.trim()).filter(Boolean);
        }
      } else {
        tags = raw.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    items.push({
      url,
      title,
      description: descIdx >= 0 ? cols[descIdx]?.trim() || undefined : undefined,
      tags,
      folder: folder || undefined,
      note: noteIdx >= 0 ? cols[noteIdx]?.trim() || undefined : undefined,
    });
  }

  return {
    source: "notion",
    items,
    folders: [...folders],
  };
}
