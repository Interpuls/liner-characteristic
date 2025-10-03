// pages/idcard/idresult.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Stack, Tag, TagLabel, Button,
  Card, CardHeader, CardBody, Table, Thead, Tbody, Tr, Th, Td, useToast, Divider
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { getToken } from "../../lib/auth";
import { getMe, listProducts } from "../../lib/api";

export default function IdResultPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);

  const { brand, model } = router.query;

  // piccola util per label leggibili
  const labelize = (k) =>
    String(k)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());

  // quali campi saltare nella tabella “specs”
  const OMIT = new Set([
    "id", "created_at", "updated_at",
    "product_type", // lo puoi mostrare sopra se vuoi
  ]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(() => {
      toast({ status: "error", title: "Sessione scaduta" });
      window.location.replace("/login");
    });
  }, [toast]);

  useEffect(() => {
    (async () => {
      if (!me || !router.isReady) return;
      const t = getToken(); if (!t) return;

      if (!model) {
        toast({ status: "warning", title: "Nessun modello selezionato." });
        router.replace("/idcard");
        return;
      }

      try {
        setLoading(true);
        const items = await listProducts(t, { brand, model, limit: 1 });
        const p = Array.isArray(items) ? items[0] : null;
        if (!p) {
          toast({ status: "info", title: "Nessun prodotto trovato per i filtri selezionati." });
        }
        setProduct(p || null);
      } catch (e) {
        toast({ status: "error", title: "Errore nel caricamento del prodotto." });
      } finally {
        setLoading(false);
      }
    })();
  }, [me, router.isReady, brand, model, toast, router]);

  if (!me) return <Box p={6}>Caricamento…</Box>;

  return (
    <>
      <AppHeader title="Liner ID Result" subtitle="Dettaglio prodotto selezionato" backHref="/idcard" />

      <Box as="main" maxW="6xl" mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        {/* Riepilogo filtri */}
        <Card mb={4}>
          <CardHeader py={3}><Heading size="sm">Filtri</Heading></CardHeader>
          <CardBody pt={0}>
            <Stack direction={{ base: "column", md: "row" }} gap={3} align="flex-start" flexWrap="wrap">
              {brand ? <Tag size="md" colorScheme="blue"><TagLabel>Brand: {brand}</TagLabel></Tag> : null}
              {model ? <Tag size="md" colorScheme="blue"><TagLabel>Model: {model}</TagLabel></Tag> : null}
            </Stack>
          </CardBody>
        </Card>

        {/* Dettaglio prodotto */}
        <Card>
          <CardHeader py={3}>
            <HStack justify="space-between" align="center">
              {product ? (
                <Heading size="md"> {product.model} </Heading>
              ) : null}
              
              {product ? (
                <Tag size="sm" variant="subtle">
                  <TagLabel>{product.brand}</TagLabel>
                </Tag>
              ) : null}
            </HStack>
          </CardHeader>

          <CardBody pt={0}>
            {loading ? (
              <Text py={8} color="gray.600">Caricamento…</Text>
            ) : !product ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">Nessun prodotto corrispondente.</Text>
                <Button onClick={() => router.push("/idcard")} variant="outline">Torna ai filtri</Button>
              </VStack>
            ) : (
              <>
                {/* Header breve prodotto */}
                <VStack align="start" spacing={1} mb={4}>
                  
                  {product.product_type ? (
                    <Text color="gray.600" fontSize="sm">Type: {product.product_type}</Text>
                  ) : null}
                  {product.compound ? (
                    <Text color="gray.600" fontSize="sm">Compound: {product.compound}</Text>
                  ) : null}
                </VStack>

                <Divider my={3} />

                {/* Tabella specifiche (auto) */}
                <Box overflowX="auto">
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Proprietà</Th>
                        <Th>Valore</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {Object.entries(product)
                        .filter(([k, v]) => !OMIT.has(k) && v !== null && v !== undefined && v !== "")
                        .map(([k, v]) => (
                          <Tr key={k}>
                            <Td w="40%">{labelize(k)}</Td>
                            <Td>{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </Box>

                <HStack mt={6} gap={3}>
                  <Button onClick={() => router.push("/idcard")} variant="outline">Modifica filtri</Button>
                  {/* Se in futuro vorrai un pulsante "Crea ID Card" o "Esporta", mettilo qui */}
                </HStack>
              </>
            )}
          </CardBody>
        </Card>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </>
  );
}
