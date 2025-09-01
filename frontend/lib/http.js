// lib/http.js
export async function http(path, { method = "GET", token, body } = {}) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      mode: "cors",
      credentials: "omit", // non usi cookie
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let msg = await res.text().catch(() => "");
    try {
      const j = JSON.parse(msg);
      msg = j?.detail || j?.message || msg;
    } catch {}
    throw new Error(msg || `HTTP ${res.status} ${res.statusText}`);
  }

  // alcune PUT/DELETE e perfino certe POST possono ritornare body vuoto
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
