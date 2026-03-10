import type { ParseResult, ParsedImportItem } from "../types";

export function parseCSVRows(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] =>
    (line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? []).map((c) =>
      c.replace(/^"|"$/g, "").replace(/""/g, '"')
    );

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

export function parseGenericCSV(text: string): ParseResult {
  const { headers, rows } = parseCSVRows(text);

  const lower = headers.map((h) => h.toLowerCase().trim());
  const urlIdx = lower.indexOf("url");
  const titleIdx = lower.indexOf("title");
  const descIdx = lower.indexOf("description");
  const tagsIdx = lower.indexOf("tags");

  if (urlIdx === -1 || titleIdx === -1) {
    return { source: "generic", items: [], folders: [] };
  }

  const items: ParsedImportItem[] = [];

  for (const cols of rows) {
    const url = cols[urlIdx]?.trim();
    const title = cols[titleIdx]?.trim();
    if (!url || !title) continue;

    const tags =
      tagsIdx >= 0 && cols[tagsIdx]?.trim()
        ? cols[tagsIdx].trim().split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;

    items.push({
      url,
      title,
      description: descIdx >= 0 ? cols[descIdx]?.trim() || undefined : undefined,
      tags,
    });
  }

  return { source: "generic", items, folders: [] };
}

export function parseGenericJSON(text: string): ParseResult {
  const json = JSON.parse(text);
  const arr: Record<string, unknown>[] = Array.isArray(json)
    ? json
    : (json.items ?? []);

  const items: ParsedImportItem[] = arr
    .filter(
      (i) =>
        typeof i.url === "string" &&
        i.url.trim() &&
        typeof i.title === "string" &&
        i.title.trim()
    )
    .map((i) => ({
      url: (i.url as string).trim(),
      title: (i.title as string).trim(),
      description:
        typeof i.description === "string" ? i.description.trim() : undefined,
      tags: Array.isArray(i.tags)
        ? (i.tags as string[]).map((t) => String(t).trim()).filter(Boolean)
        : typeof i.tags === "string"
          ? i.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
    }));

  return { source: "generic", items, folders: [] };
}
