import { http } from "./http";

export const loginApi = async (email, password) => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMe = (token) => http("/me", { token });


// ---------------------------- PRODUCTS ----------------------------

export const getProductsMeta = (token) => http("/products/meta", { token });

export const listProducts = (token, params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") usp.set(k, String(v)); });
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`/products${qs}`, { token });
};

export const listProductPrefs = (token) => http("/products/preferences", { token });

export const saveProductPref  = (token, name, filters) =>
  http("/products/preferences", { method: "POST", token, body: { name, filters } });


export const createProduct = (token, body) =>
  http("/products", { method: "POST", token, body });

export const updateProduct = (token, id, body) =>
  http(`/products/${id}`, { method: "PUT", token, body });

export const deleteProduct = (token, id) =>
  http(`/products/${id}`, { method: "DELETE", token });

// product applications (per prodotto)
export const listProductApplications = (token, productId) =>
  http(`/products/${productId}/applications`, { token });

// singolo prodotto (per mostrare info tecniche, se servono)
export const getProduct = (token, id) =>
  http(`/products/${id}`, { token });

// ---------------------------- KPIs ----------------------------
export const listKpis = (token) => http("/kpis", { token });

// lib/api.js
export const putKpiScales = (token, code, body) =>
  http(`/kpis/${code}/scales`, { method: "PUT", token, body });

// se hai un GET scales:
export const getKpiScales = (token, code) =>
  http(`/kpis/${code}/scales`, { token });

// --- KPI (valori calcolati) ---
export async function getKpiValuesByPA(token, productApplicationId) {
  return http(`/kpis/values?product_application_id=${productApplicationId}`, {
    method: "GET",
    token,
  });
}


// ---------------------------- TPP TESTS ----------------------------
export const createTppRun = (token, body) =>
  http(`/tpp/runs`, { method: "POST", token, body });

export const computeTppRun = (token, runId) =>
  http(`/tpp/runs/${runId}/compute`, { method: "POST", token });

export const listTppRuns = (token, { product_application_id } = {}) =>
  http(`/tpp/runs${product_application_id ? `?product_application_id=${product_application_id}` : ""}`, { token });

export const getTppRunKpis = (token, runId) =>
  http(`/tpp/runs/${runId}/kpis`, { token });

export const getLastTppRunForApplication = (token, productApplicationId) =>
  http(`/tpp/last-run-by-application/${productApplicationId}`, { token });


// ---------------------------- MASSAGE TESTS ----------------------------
export async function createMassageRun(token, payload) {
  // payload = { product_application_id, points:[{pressure_kpa,min_val,max_val}], notes? }
  return http(`/massage/runs`, { method: "POST", token, body: payload });
}

export const computeMassageRun = (token, runId) => {
  return http(`/massage/runs/${runId}/compute`, { method: "POST", token });
};

export async function listMassageRuns(token, { productApplicationId, limit = 10, offset = 0 } = {}) {
  const qs = new URLSearchParams();
  if (productApplicationId) qs.set("product_application_id", productApplicationId);
  if (limit) qs.set("limit", String(limit));
  if (offset) qs.set("offset", String(offset));
  return http(`/massage/runs?${qs.toString()}`, { method: "GET", token });
}

export async function getLatestMassageRun(token, productApplicationId) {
  const qs = new URLSearchParams({ product_application_id: String(productApplicationId) }).toString();
  return http(`/massage/runs/latest?${qs}`, { token });
}

export async function upsertMassagePoints(token, runId, points) {
  // points = [{pressure_kpa,min_val,max_val}, ...]
  return http(`/massage/runs/${runId}/points`, { method: "PUT", token, body: points });
}

export const updateMassagePoints = (token, runId, points) =>
  http(`/massage/runs/${runId}/points`, {
    method: "PUT",
    token,
    body: points, // array: [{pressure_kpa, min_val, max_val}, ...]
  });


// ---------------------------- SPEED TESTS ----------------------------

export const getLatestSpeedRun = (token, productApplicationId) =>
  http(`/speed/runs/latest?product_application_id=${productApplicationId}`, { token });

export const createSpeedRun = (token, body) =>
  http(`/speed/runs`, { method: "POST", token, body });

export const upsertSpeedMeasures = (token, runId, measures) =>
  http(`/speed/runs/${runId}/measures`, { method: "PUT", token, body: measures });

export const computeSpeedRun = (token, runId) =>
  http(`/speed/runs/${runId}/compute`, { method: "POST", token });

