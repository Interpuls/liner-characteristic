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


export const createProduct = (token, product) =>
  http("/products", { method: "POST", token, body: product });

// ---------------------------- KPIs ----------------------------
export const listKpis = (token) => http("/kpis", { token });