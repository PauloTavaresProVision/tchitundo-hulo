const MAX_JSON_BYTES = 2 * 1024 * 1024;

export function sameOriginRequest(request: Request) {
  if (!allowedRequestHost(request)) return false;
  const originHeader = request.headers.get("origin");
  if (!originHeader) return request.headers.get("sec-fetch-site") === "same-origin";

  try {
    const origin = new URL(originHeader);
    return origin.host.toLowerCase() === requestHost(request)
      && origin.protocol === `${requestProtocol(request)}:`;
  } catch {
    return false;
  }
}

export function allowedRequestHost(request: Request) {
  const allowed = (process.env.APP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return allowed.length === 0 || allowed.includes(requestHost(request));
}

export function clientAddress(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    return firstHeaderValue(request.headers.get("x-forwarded-for"))
      || firstHeaderValue(request.headers.get("x-real-ip"))
      || "proxy-unknown";
  }
  return "direct";
}

export function jsonRequestTooLarge(request: Request, maximum = MAX_JSON_BYTES) {
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > maximum;
}

export function requestHost(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const forwarded = firstHeaderValue(request.headers.get("x-forwarded-host"));
    if (forwarded) return forwarded.toLowerCase();
  }
  return (firstHeaderValue(request.headers.get("host")) || new URL(request.url).host).toLowerCase();
}

export function requestProtocol(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const forwarded = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    if (forwarded === "https" || forwarded === "http") return forwarded;
  }
  return new URL(request.url).protocol.replace(":", "");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() ?? "";
}
