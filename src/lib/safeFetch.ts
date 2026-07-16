import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");

  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

export async function assertSafeRemoteUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP(S) URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private network URLs are not allowed");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Private network URLs are not allowed");
  }

  return url;
}

export async function fetchRemoteResource(
  value: string,
  maxBytes: number,
  headers: HeadersInit = {},
): Promise<{ body: Buffer; contentType: string; response: Response }> {
  let currentUrl = value;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const safeUrl = await assertSafeRemoteUrl(currentUrl);
    const response = await fetch(safeUrl, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new Error("Too many or invalid redirects");
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxBytes) {
      throw new Error("Remote response is too large");
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maxBytes) {
      throw new Error("Remote response is too large");
    }

    return {
      body,
      contentType: response.headers.get("content-type") || "application/octet-stream",
      response,
    };
  }

  throw new Error("Unable to fetch remote resource");
}
