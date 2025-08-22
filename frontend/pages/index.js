import { useEffect } from "react";
import { getToken } from "../lib/auth";

export default function Home() {
  useEffect(() => {
    const t = getToken();
    window.location.replace(t ? "/products" : "/login");
  }, []);
  return null;
}
