import { useEffect } from "react";
import { getToken } from "../lib/auth";
import { getMe } from "../lib/api";

export default function Index() {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then(() => window.location.replace("/home")) 
      .catch(() => window.location.replace("/login"));
  }, []);
  return null;
}
