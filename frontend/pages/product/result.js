// pages/products/search.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Stack, Tag, TagLabel, Button, IconButton,
  Card, CardHeader, CardBody, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td, useToast
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { getToken } from "../../lib/auth";

export default function ProductsSearchPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState(null);

  // Placeholder risultati (collega quando vuoi)
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // [{id, brand, model, teat_size, ...}]

  // Leggo i filtri dalla query
  const { brand, model, teat_size, ...rest } = router.query;

  const kpis = useMemo(() => {
    // tutti i parametri che iniziano con kpi e hanno un valore
    return Object.entries(rest)
      .filter(([k, v]) => k.toLowerCase().startsWith("kpi") && v)
      .map(([, v]) => String(v));
  }, [rest]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace("/login");
      return;
    }
    setMe({ ok: true }); // manteniamo la pagina “banale” senza toccare backend
  }, []);

  // Quando vorrai collegare il backend:
  // 1) scommenta la useEffect sotto
  // 2) implementa la fetch verso il tuo endpoint di ricerca
  //
  // useEffect(() => {
  //   if (!router.isReady) return;
  //   const t = getToken();
  //   if (!t) return;
  //
  //   setLoading(true);
  //   const params = new URLSearchParams(router.query as Record<string, string>);
  //   fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/search?${params.toString()}`, {
  //     headers: { Authorization: `Bearer ${t}` },
  //   })
  //     .then(r => r.ok ? r.json() : Promise.reject(r))
  //     .then(data => setItems(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])))
  //     .catch(() => toast({ status: "error", title: "Errore nel caricamento dei risultati" }))
  //     .finally(() => setLoading(false));
  // }, [router.isReady, router.query, toast]);

  if (!me) return <Box p={6}>Caricamento…</Box>;

  return (
    <>
      <AppHeader
        title="Search Results"
        subtitle="Riepilogo filtri e risultati della ricerca prodotti."
        backHref="/product"
      />

      <Box as="main" maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }}>
        {/* Riepilogo Filtri */}
        <Card mb={4}>
          <CardHeader py={3}><Heading size="sm">Filtri attivi</Heading></CardHeader>
          <CardBody pt={0}>
            <Stack direction={{ base: "column", md: "row" }} gap={3} align="flex-start" flexWrap="wrap">
              {brand ? (
                <Tag size="md" colorScheme="blue"><TagLabel>Brand: {brand}</TagLabel></Tag>
              ) : null}
              {model ? (
                <Tag size="md" colorScheme="blue"><TagLabel>Model: {model}</TagLabel></Tag>
              ) : null}
              {teat_size ? (
                <Tag size="md" colorScheme="blue"><TagLabel>Teat size: {teat_size}</TagLabel></Tag>
              ) : null}
              {kpis.length ? (
                <HStack gap={2} wrap="wrap">
                  {kpis.map((k, i) => (
                    <Tag key={i} size="md" colorScheme="purple"><TagLabel>KPI: {k}</TagLabel></Tag>
                  ))}
                </HStack>
              ) : null}

              {(!brand && !model && !teat_size && kpis.length === 0) && (
                <Text color="gray.500" fontSize="sm">Nessun filtro selezionato.</Text>
              )}
            </Stack>

            <HStack mt={4} gap={3}>
              <Button onClick={() => router.push("/product")} variant="outline">
                Modifica filtri
              </Button>
              <Button
                leftIcon={<RepeatIcon />}
                onClick={() => {
                  toast({ status: "info", title: "Ricerca non ancora collegata al backend" });
                }}
                isLoading={loading}
                loadingText="Ricerca in corso…"
                colorScheme="blue"
              >
                Riesegui ricerca
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Risultati */}
        <Card>
          <CardHeader py={3}>
            <HStack justify="space-between" align="center">
              <Heading size="sm">Risultati</Heading>
              <Tag size="sm" variant="subtle">
                <TagLabel>{items.length} trovati</TagLabel>
              </Tag>
            </HStack>
          </CardHeader>

          <CardBody pt={0}>
            {items.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">Nessun risultato (pagina banale pronta per l’aggancio al backend).</Text>
                <Text color="gray.500" fontSize="sm">Usa “Modifica filtri” o collega la fetch nella useEffect commentata.</Text>
              </VStack>
            ) : (
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Brand</Th>
                      <Th>Model</Th>
                      <Th>Teat size</Th>
                      {/* aggiungi qui altre colonne se servono */}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {items.map((p) => (
                      <Tr key={p.id || `${p.brand}-${p.model}`}>
                        <Td>{p.brand ?? "-"}</Td>
                        <Td>{p.model ?? "-"}</Td>
                        <Td>{p.teat_size ?? "-"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </>
  );
}
