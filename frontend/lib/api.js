import { http } from "./http";

export const loginApi = async (email, password) => {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const body = new URLSearchParams({ username: email, password });

  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMe = (token) => http("auth/me", { token });
export const updateUserUnitSystem = (token, userId, unit_system) =>
  http(`users/${userId}`, { method: "PUT", token, body: { unit_system } });

// ---------------------------- NEWS ----------------------------
export const listNews = (token) => http("news", { token });

export const listNewsAdmin = (token) => http("news/admin", { token });

export const createNews = (token, body) =>
  http("news", { method: "POST", token, body });

export const updateNews = (token, id, body) =>
  http(`news/${id}`, { method: "PUT", token, body });

export const deleteNews = (token, id) =>
  http(`news/${id}`, { method: "DELETE", token });


// ---------------------------- PRODUCTS ----------------------------

export const getProductsMeta = (token) => http("products/meta", { token });

export const getModelsByBrand = (token, brand) =>
  http(`products/models?brand=${encodeURIComponent(brand)}`, { token });

export const listProducts = (token, params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") usp.set(k, String(v)); });
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`products${qs}`, { token });
};

export const listProductPrefs = (token) => http("products/preferences", { token });

export const saveProductPref = (token, name, filters) =>
  http("products/preferences", { method: "POST", token, body: { name, filters } });

export const deleteProductPrefById = (token, prefId) =>
  http(`products/preferences/${prefId}`, { method: "DELETE", token });

export const deleteProductPrefByName = (token, name) =>
  http(`products/preferences?name=${encodeURIComponent(name)}`, { method: "DELETE", token });


export const createProduct = (token, body) =>
  http("products", { method: "POST", token, body });

export const updateProduct = (token, id, body) =>
  http(`products/${id}`, { method: "PUT", token, body });

export const deleteProduct = (token, id) =>
  http(`products/${id}`, { method: "DELETE", token });

// product applications (per prodotto)
export const listProductApplications = (token, productId) =>
  http(`products/${productId}/applications`, { token });

export const createProductApplication = (token, productId, body) =>
  http(`products/${productId}/applications`, { method: "POST", token, body });

export const deleteProductApplication = (token, productId, appId) =>
  http(`products/${productId}/applications/${appId}`, { method: "DELETE", token });

// singolo prodotto (per mostrare info tecniche, se servono)
export const getProduct = (token, id) =>
  http(`products/${id}`, { token });

// ---------------------------- KPIs ----------------------------
export const listKpis = (token) => http("kpis", { token });

// lib/api.js
export const putKpiScales = (token, code, body) =>
  http(`kpis/${code}/scales`, { method: "PUT", token, body });

// se hai un GET scales:
export const getKpiScales = (token, code) =>
  http(`kpis/${code}/scales`, { token });

export const getOverviewRankings = (
  token,
  {
    kpis = "CLOSURE,FITTING,CONGESTION_RISK,HYPERKERATOSIS_RISK,SPEED,RESPRAY,FLUYDODINAMIC,SLIPPAGE,RINGING_RISK",
    teat_sizes = "XS,S,M,L",
    limit = 3,
  } = {}
) =>
  http(
    `rankings/overview?kpis=${encodeURIComponent(kpis)}&teat_sizes=${encodeURIComponent(
      teat_sizes
    )}&limit=${encodeURIComponent(limit)}`,
    { token }
  );

// --- KPI (valori calcolati) ---
export async function getKpiValuesByPA(token, productApplicationId) {
  return http(`kpis/values?product_application_id=${productApplicationId}`, {
    method: "GET",
    token,
  });
}


// ---------------------------- TPP TESTS ----------------------------
export const createTppRun = (token, body) =>
  http(`tpp/runs`, { method: "POST", token, body });

export const computeTppRun = (token, runId) =>
  http(`tpp/runs/${runId}/compute`, { method: "POST", token });

export const listTppRuns = (token, { product_application_id } = {}) =>
  http(`tpp/runs${product_application_id ? `?product_application_id=${product_application_id}` : ""}`, { token });

export const getTppRunKpis = (token, runId) =>
  http(`tpp/runs/${runId}/kpis`, { token });

export const getLastTppRunForApplication = (token, productApplicationId) =>
  http(`tpp/last-run-by-application/${productApplicationId}`, { token });


// ---------------------------- MASSAGE TESTS ----------------------------
export async function createMassageRun(token, payload) {
  // payload = { product_application_id, points:[{pressure_kpa,min_val,max_val}], notes? }
  return http(`massage/runs`, { method: "POST", token, body: payload });
}

export const computeMassageRun = (token, runId) => {
  return http(`massage/runs/${runId}/compute`, { method: "POST", token });
};

export async function listMassageRuns(token, { productApplicationId, limit = 10, offset = 0 } = {}) {
  const qs = new URLSearchParams();
  if (productApplicationId) qs.set("product_application_id", productApplicationId);
  if (limit) qs.set("limit", String(limit));
  if (offset) qs.set("offset", String(offset));
  return http(`massage/runs?${qs.toString()}`, { method: "GET", token });
}

export async function getLatestMassageRun(token, productApplicationId) {
  const qs = new URLSearchParams({ product_application_id: String(productApplicationId) }).toString();
  return http(`massage/runs/latest?${qs}`, { token });
}

export async function upsertMassagePoints(token, runId, points) {
  // points = [{pressure_kpa,min_val,max_val}, ...]
  return http(`massage/runs/${runId}/points`, { method: "PUT", token, body: points });
}

export const updateMassagePoints = (token, runId, points) =>
  http(`massage/runs/${runId}/points`, {
    method: "PUT",
    token,
    body: points, // array: [{pressure_kpa, min_val, max_val}, ...]
  });



// ---------------------------- SPEED TESTS ----------------------------
export const createSpeedRun = (token, body) =>
  http(`speed/runs`, { method: "POST", token, body });

export const computeSpeedRun = (token, runId) =>
  http(`speed/runs/${runId}/compute`, { method: "POST", token });

export const listSpeedRuns = (token, { product_application_id } = {}) =>
  http(
    `/speed/runs${
      product_application_id ? `?product_application_id=${product_application_id}` : ""
    }`,
    { token }
  );

export const getSpeedRunKpis = (token, runId) =>
  http(`speed/runs/${runId}/kpis`, { token });

export const getLastSpeedRunForApplication = (token, productApplicationId) =>
  http(`speed/last-run-by-application/${productApplicationId}`, { token });



// ---------------------------- SMT / HOOD TESTS ----------------------------
export const createSmtHoodRun = (token, body) =>
  http(`smt-hood/runs`, { method: "POST", token, body });

export const computeSmtHoodRun = (token, runId) =>
  http(`smt-hood/runs/${runId}/compute`, { method: "POST", token });

export const listSmtHoodRuns = (token, { product_application_id } = {}) =>
  http(
    `smt-hood/runs${
      product_application_id ? `?product_application_id=${product_application_id}` : ""
    }`,
    { token }
  );

export const getLatestSmtHoodRun = (token, productApplicationId) =>
  http(`smt-hood/runs/latest?product_application_id=${productApplicationId}`, { token });

export const upsertSmtHoodPoints = (token, runId, points) =>
  http(`smt-hood/runs/${runId}/points`, { method: "PUT", token, body: points });

// ---------------------------- SETTING CALCULATOR ----------------------------
export const compareSettingCalculator = (token, body) =>
  http(`setting-calculator/compare`, { method: "POST", token, body });
