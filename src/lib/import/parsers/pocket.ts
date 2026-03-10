import type { ParseResult, ParsedImportItem } from "../types";

export function parsePocket(html: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = doc.querySelectorAll("a");

  const items: ParsedImportItem[] = [];

  links.forEach((a) => {
    const url = a.getAttribute("href")?.trim();
    const title = a.textContent?.trim();
    if (!url || !title) return;

    try {
      new URL(url);
    } catch {
      return;
    }

    const tagsAttr = a.getAttribute("tags");
    const tags = tagsAttr
      ? tagsAttr.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const addDate = a.getAttribute("add_date") || a.getAttribute("ADD_DATE");
    let createdAt: string | undefined;
    if (addDate) {
      const ts = parseInt(addDate, 10);
      if (!isNaN(ts)) {
        createdAt = new Date(ts * 1000).toISOString();
      }
    }

    items.push({ url, title, tags, createdAt });
  });

  return {
    source: "pocket",
    items,
    folders: [],
  };
}
