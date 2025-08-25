import NextLink from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@chakra-ui/react";

export default function Home() {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then(() => window.location.replace("/search")) // placeholder: manda alla prima pagina utile
      .catch(() => window.location.replace("/login"));
  }, []);
  return (
    <div>
    <Text>Pagina Home</Text>
    <Button as={NextLink} href="/product" colorScheme="teal" size="lg" mt="6" mx="auto" display="block">
      Vai a Prodotti
    </Button>
    </div>
  )
}