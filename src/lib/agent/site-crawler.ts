import { isSafeUrl } from "@/lib/utils/url";
import type { CrawledContent } from "./types";

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

export interface CrawlResult {
  contents: CrawledContent[];
  discoveredFeedUrl?: string;
}

export async function crawlSite(
  url: string,
  feedUrl?: string | null
): Promise<CrawlResult> {
  // SSRF protection: validate URL before any fetch
  if (!(await isSafeUrl(url))) {
    return { contents: [] };
  }

  // Try RSS/Atom feed first
  const discoveredFeedUrl = feedUrl || (await discoverFeedUrl(url));
  if (discoveredFeedUrl && (await isSafeUrl(discoveredFeedUrl))) {
    try {
      const contents = await parseFeed(discoveredFeedUrl);
      return {
        contents,
        discoveredFeedUrl: feedUrl ? undefined : discoveredFeedUrl,
      };
    } catch {
      // Fall through to HTML scraping
    }
  }

  // HTML fallback
  const contents = await scrapeHtml(url);
  return { contents };
}

async function discoverFeedUrl(siteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(siteUrl, {
      headers: { "User-Agent": "Curyloop-Agent/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Look for RSS/Atom link tags
    const feedPatterns = [
      /<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/rss\+xml["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/atom\+xml["']/i,
    ];

    for (const pattern of feedPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return new URL(match[1], siteUrl).href;
      }
    }

    // Try common feed paths concurrently (instead of sequentially)
    const commonPaths = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml"];
    const results = await Promise.allSettled(
      commonPaths.map(async (path) => {
        const feedRes = await fetch(new URL(path, siteUrl).href, {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
        });
        if (
          feedRes.ok &&
          (feedRes.headers.get("content-type")?.includes("xml") ||
            feedRes.headers.get("content-type")?.includes("rss"))
        ) {
          return new URL(path, siteUrl).href;
        }
        return null;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        return result.value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function parseFeed(feedUrl: string): Promise<CrawledContent[]> {
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "Curyloop-Agent/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);

  const xml = await res.text();
  const items: FeedItem[] = [];

  // Simple RSS parsing (works for RSS 2.0 and Atom)
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link =
      extractTag(itemXml, "link") || extractAttr(itemXml, "link", "href");
    const description =
      extractTag(itemXml, "description") ||
      extractTag(itemXml, "summary") ||
      extractTag(itemXml, "content");
    const pubDate =
      extractTag(itemXml, "pubDate") ||
      extractTag(itemXml, "published") ||
      extractTag(itemXml, "updated");

    if (title && link) {
      items.push({
        title: stripHtml(title).slice(0, 300),
        link,
        description: stripHtml(description || "").slice(0, 1000),
        pubDate: pubDate || undefined,
      });
    }
  }

  return items.map((item) => ({
    url: item.link,
    title: item.title,
    description: item.description,
    publishedAt: item.pubDate,
  }));
}

async function scrapeHtml(url: string): Promise<CrawledContent[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Curyloop-Agent/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const contents: CrawledContent[] = [];

    // Extract articles/links from the page
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const seen = new Set<string>();

    let linkMatch;
    while (
      (linkMatch = linkRegex.exec(html)) !== null &&
      contents.length < 20
    ) {
      const href = linkMatch[1];
      const text = stripHtml(linkMatch[2]).trim();

      if (
        !text ||
        text.length < 10 ||
        text.length > 300 ||
        seen.has(href) ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }

      try {
        const fullUrl = new URL(href, url).href;
        if (seen.has(fullUrl)) continue;
        seen.add(fullUrl);

        contents.push({
          url: fullUrl,
          title: text,
          description: "",
        });
      } catch {
        continue;
      }
    }

    return contents;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
