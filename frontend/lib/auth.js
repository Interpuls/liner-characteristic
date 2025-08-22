const KEY = "token";


export const getToken = () =>
    typeof window === "undefined" ? null : localStorage.getItem(KEY);


export const setToken = (t) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, t);
    // Set cookie for server-side access
    document.cookie = `token=${t}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};

export const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  // cancella cookie
  document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
};