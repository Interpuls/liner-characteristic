function safeDecode(value) {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Accept only same-origin relative paths (e.g. /home?x=1#y)
export function safeInternalPath(input, fallback = "/") {
  const candidate = safeDecode(input).trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;

  try {
    const base = "http://localhost";
    const url = new URL(candidate, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

