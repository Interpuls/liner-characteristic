import { http } from "./http";

export const login = async (email, password) => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMe = (token) => http("/me", { token });
export const listProducts = (token) => http("/products", { token });
export const createProduct = (token, dto) => http("/products", { method: "POST", token, body: dto });
