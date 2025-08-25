import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box, Button, Heading, SimpleGrid, LinkBox, LinkOverlay,
  Text, HStack, Spacer, Badge, useToast,
} from "@chakra-ui/react";
import { getToken, clearToken } from "../lib/auth";
import { getMe } from "../lib/api";

function NavCard({ href, title, desc, badge }) {
  return (
    <LinkBox as="article" p="5" borderWidth="1px" rounded="xl"
      _hover={{ shadow: "md", borderColor: "blue.300" }} transition="all 0.15s ease">
      <Heading size="md" mb="2">
        <LinkOverlay as={NextLink} href={href}>{title}</LinkOverlay>
      </Heading>
      <Text color="gray.600">{desc}</Text>
      {badge ? <Badge mt="3" colorScheme="blue" variant="subtle">{badge}</Badge> : null}
    </LinkBox>
  );
}

export default function Home() {
  const [role, setRole] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then((me) => setRole(me.role))
      .catch(() => { clearToken(); toast({ status: "error", title: "Sessione scaduta" }); window.location.replace("/login"); });
  }, []);

  if (!role) return <Box p="8">Caricamento…</Box>;
  const isAdmin = role === "admin";

  return (
    <Box maxW="6xl" mx="auto" p={{ base: 4, md: 8 }}>
      <HStack mb="6">
        <Heading size="lg">Liner Characteristic</Heading>
        <Spacer />
        <HStack>
          <Badge colorScheme={isAdmin ? "purple" : "green"}>{isAdmin ? "Admin" : "User"}</Badge>
          <Button size="sm" variant="outline" onClick={() => { clearToken(); window.location.replace("/login"); }}>
            Logout
          </Button>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        <NavCard href="/product"   title="Liner Search"     desc="Cerca e vedi grafici rapidi." />
        <NavCard href="/id-card"  title="Liner ID Card"    desc="Scheda dettagliata del prodotto." />
        <NavCard href="/compare"  title="Setting Calculator" desc="Confronta due modelli." />
        <NavCard href="/help"     title="Info & Guida"     desc="Come leggere i grafici." />
        {isAdmin && (
          <>
            <NavCard href="/admin/products" title="Gestione Prodotti" desc="Gestione prodotti / modelli." badge="Admin" />
            <NavCard href="/admin/tests"    title="Campagne di Test"  desc="Registra test e risultati." badge="Admin" />
            <NavCard href="/admin/kpis"     title="Definizione KPI"   desc="Definisci KPI e formule."  badge="Admin" />
          </>
        )}
      </SimpleGrid>
    </Box>
  );
}