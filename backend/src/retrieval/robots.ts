import { assertSafeUrl } from "./urlSafety.js";

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

const cache = new Map<string, RobotsRules>();

/** Minimal robots.txt parser: honours a `User-agent: *` group's Allow/Disallow prefixes. */
function parseRobots(body: string): RobotsRules {
  const lines = body.split(/\r?\n/);
  const rules: RobotsRules = { disallow: [], allow: [] };
  let inWildcardGroup = false;
  let sawAnyUserAgent = false;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      sawAnyUserAgent = true;
      inWildcardGroup = value === "*";
    } else if (key === "disallow" && (inWildcardGroup || !sawAnyUserAgent)) {
      if (value) rules.disallow.push(value);
    } else if (key === "allow" && (inWildcardGroup || !sawAnyUserAgent)) {
      if (value) rules.allow.push(value);
    }
  }
  return rules;
}

async function getRobotsRules(origin: string): Promise<RobotsRules> {
  if (cache.has(origin)) return cache.get(origin)!;
  let rules: RobotsRules = { disallow: [], allow: [] };
  try {
    const robotsUrl = new URL("/robots.txt", origin);
    await assertSafeUrl(robotsUrl.toString());
    const res = await fetch(robotsUrl.toString(), { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const body = await res.text();
      rules = parseRobots(body);
    }
  } catch {
    // No robots.txt, unreachable, or unsafe — treat as "no restrictions" and continue.
  }
  cache.set(origin, rules);
  return rules;
}

export async function isAllowedByRobots(targetUrl: string): Promise<boolean> {
  const url = new URL(targetUrl);
  const rules = await getRobotsRules(url.origin);
  const path = url.pathname + url.search;

  const matchingAllow = rules.allow.filter((p) => path.startsWith(p));
  const matchingDisallow = rules.disallow.filter((p) => path.startsWith(p));
  if (matchingDisallow.length === 0) return true;

  const longestAllow = Math.max(0, ...matchingAllow.map((p) => p.length));
  const longestDisallow = Math.max(0, ...matchingDisallow.map((p) => p.length));
  return longestAllow >= longestDisallow;
}
