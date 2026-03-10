import type { ImportSource } from "./types";

export function detectSource(
  text: string,
  filename: string
): ImportSource | null {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "html" || ext === "htm") {
    if (/\bTAGS="/.test(text)) return "pocket";
    if (/<DL>/i.test(text)) return "browser";
    return null;
  }

  if (ext === "json") {
    return "generic";
  }

  if (ext === "csv") {
    const firstLine = text.split("\n")[0]?.toLowerCase() ?? "";
    if (
      firstLine.includes("folder") &&
      firstLine.includes("url") &&
      firstLine.includes("tags") &&
      firstLine.includes("created")
    ) {
      return "raindrop";
    }
    if (
      (firstLine.includes("name") || firstLine.includes("title")) &&
      (firstLine.includes("url") || firstLine.includes("link"))
    ) {
      const hasUrl = firstLine.includes('"url"') || /\burl\b/.test(firstLine);
      const hasTitle =
        firstLine.includes('"title"') || /\btitle\b/.test(firstLine);
      if (!hasUrl || !hasTitle) return "notion";
    }
    const hasUrl =
      firstLine.includes('"url"') || /(?:^|,)url(?:,|$)/.test(firstLine);
    const hasTitle =
      firstLine.includes('"title"') || /(?:^|,)title(?:,|$)/.test(firstLine);
    if (hasUrl && hasTitle) return "generic";
    if (firstLine.includes(",")) return "notion";
    return null;
  }

  return null;
}
