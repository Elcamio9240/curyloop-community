export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.protocol = "https:";
    url.hostname = url.hostname.replace(/^www\./, "");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "fbclid", "gclid", "mc_cid", "mc_eid",
    ];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
    url.searchParams.sort();
    url.hash = "";
    return url.toString();
  } catch {
    return raw;
  }
}
