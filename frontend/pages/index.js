import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    window.location.replace("/home");
  }, []);
  return null;
}