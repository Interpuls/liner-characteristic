import { useEffect } from "react";
import { getToken } from "../lib/auth";
import { getMe } from "../lib/api";

export default function Home() {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then(() => window.location.replace("/search")) // placeholder: manda alla prima pagina utile
      .catch(() => window.location.replace("/login"));
  }, []);
  return null;
}
