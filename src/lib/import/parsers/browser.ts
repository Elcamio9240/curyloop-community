import type { ParseResult, ParsedImportItem } from "../types";

export function parseBrowserBookmarks(html: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const folders = new Set<string>();
  const items: ParsedImportItem[] = [];

  function walk(dl: Element, path: string[]) {
    const children = dl.children;
    for (let i = 0; i < children.length; i++) {
      const dt = children[i];
      if (dt.tagName !== "DT") continue;

      const h3 = dt.querySelector(":scope > h3, :scope > H3");
      if (h3) {
        const folderName = h3.textContent?.trim() ?? "";
        const newPath = [...path, folderName];
        const innerDl = dt.querySelector(":scope > dl, :scope > DL");
        if (innerDl) {
          walk(innerDl, newPath);
        }
        continue;
      }

      const a = dt.querySelector(":scope > a, :scope > A");
      if (a) {
        const url = a.getAttribute("href") || a.getAttribute("HREF");
        const title = a.textContent?.trim();
        if (!url || !title) continue;
        if (url.startsWith("javascript:") || url.startsWith("place:")) continue;

        try {
          new URL(url);
        } catch {
          continue;
        }

        const folderPath = path.join(" / ");
        if (folderPath) folders.add(folderPath);

        const addDate = a.getAttribute("add_date") || a.getAttribute("ADD_DATE");
        let createdAt: string | undefined;
        if (addDate) {
          const ts = parseInt(addDate, 10);
          if (!isNaN(ts)) {
            createdAt = new Date(ts * 1000).toISOString();
          }
        }

        items.push({
          url,
          title,
          folder: folderPath || undefined,
          createdAt,
        });
      }
    }
  }

  const rootDl = doc.querySelector("dl, DL");
  if (rootDl) {
    walk(rootDl, []);
  }

  return {
    source: "browser",
    items,
    folders: [...folders],
  };
}
