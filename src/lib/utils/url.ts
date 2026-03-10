import { URL } from "url";
import net from "net";
import dns from "dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 127.x.x.x
    if (parts[0] === 127) return true;
    // 10.x.x.x
    if (parts[0] === 10) return true;
    // 172.16.x.x - 172.31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.x.x (AWS metadata, link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts[0] === 0) return true;
  }
  if (net.isIPv6(ip)) {
    // ::1 (loopback), fe80:: (link-local), fc/fd (unique local)
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd"))
      return true;
  }
  return false;
}

export async function isSafeUrl(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const hostname = parsed.hostname;

  // Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) return false;

  // If hostname is an IP literal, check directly
  if (net.isIP(hostname)) {
    return !isPrivateIP(hostname);
  }

  // Resolve hostname and check all IPs
  try {
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    const allIps = [...addresses, ...addresses6];

    if (allIps.length === 0) return false;

    return allIps.every((ip) => !isPrivateIP(ip));
  } catch {
    return false;
  }
}
