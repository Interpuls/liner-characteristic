import { clearToken } from "./auth";

function handleUnauthorized() {
  if (typeof window === "undefined") return;

  clearToken();

  const currentPath = window.location.pathname || "/";
  const currentSearch = window.location.search || "";
  const current = `${currentPath}${currentSearch}`;
  const from = encodeURIComponent(current);

  if (currentPath !== "/login") {
    window.location.replace(`/login?from=${from}`);
  }
}

export async function http(path, { method = "GET", token, body } = {}) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const normPath =
    typeof path === "string" && path
      ? (path.startsWith("/") ? path : "/" + path)
      : "/";
  const url = base + normPath;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // helper: leggi il body UNA sola volta
  async function readBody() {
    const ct = res.headers.get("content-type") || "";
    const raw = await res.text().catch(() => "");
    if (!raw) return { raw: "", json: null };
    if (ct.includes("application/json")) {
      try { return { raw, json: JSON.parse(raw) }; }
      catch { /* non JSON valido */ }
    }
    return { raw, json: null };
  }

  if (!res.ok) {
    const { raw, json } = await readBody();
    // costruisci messaggio umano
    let msg = "";
    if (json) {
      // FastAPI spesso usa { detail: "..."} o { detail: [{loc:.., msg:..}] }
      if (typeof json.detail === "string") msg = json.detail;
      else if (Array.isArray(json.detail)) {
        msg = json.detail.map(d => d.msg || JSON.stringify(d)).join("; ");
      } else if (json.message) {
        msg = typeof json.message === "string" ? json.message : JSON.stringify(json.message);
      } else {
        msg = JSON.stringify(json);
      }
    } else {
      msg = raw || `HTTP ${res.status} ${res.statusText}`;
    }

    const err = new Error(msg);
    err.status = res.status;
    err.payload = json ?? raw ?? null;
    err.url = url;

    if (res.status === 401) {
      handleUnauthorized();
    }

    throw err;
  }

  // success: 204/205 senza body
  if (res.status === 204 || res.status === 205) return null;

  // prova JSON, altrimenti restituisci testo
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  } else {
    const text = await res.text().catch(() => "");
    return text || null;
  }
}

