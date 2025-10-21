// pages/idcard/idresult.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Button,
  Card, CardHeader, CardBody, Table, Thead, Tbody, Tr, Th, Td, useToast,
  Tag, TagLabel, Tabs, TabList, TabPanels, Tab, TabPanel
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

  const { brand, model, teat_size, from } = router.query;
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  // piccola util per label leggibili
  const labelize = (k) =>
    String(k)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());

  // quali campi saltare nella tabella “specs”
  const OMIT = new Set([
    "id", "created_at", "updated_at",
    "product_type",
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
        router.replace("/product/result");
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
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Liner ID Result" subtitle="Dettaglio prodotto selezionato" backHref={backHref} />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }} w="100%">
        {/* Dettaglio prodotto */}
        <Card w="100%">
          <CardHeader py={3}>
            <VStack align="start" spacing={1}>
              {product ? <Heading size="md">{product.model}</Heading> : null}
              <HStack>
                {product?.brand ? (
                  <Tag size="sm" variant="subtle"><TagLabel>{product.brand}</TagLabel></Tag>
                ) : null}
                {product?.compound ? (
                  <Tag size="sm" variant="subtle"><TagLabel>Compound: {product.compound}</TagLabel></Tag>
                ) : null}
              </HStack>
            </VStack>
          </CardHeader>

          <CardBody pt={0}>
            {loading ? (
              <Text py={8} color="gray.600">Caricamento…</Text>
            ) : !product ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">Nessun prodotto corrispondente.</Text>
                <Button onClick={() => router.push(backHref)} variant="outline">Torna ai risultati</Button>
              </VStack>
            ) : (
              <>
                {/* Tabs: Details | KPIs | Tests */}
                <Tabs colorScheme="blue" mt={2} w="100%" isFitted>
                  <TabList>
                    <Tab>Details</Tab>
                    <Tab>KPIs</Tab>
                    <Tab>Tests</Tab>
                  </TabList>
                  <TabPanels w="100%">
                    <TabPanel px={0} w="100%">
                      {/* Tabella specifiche (auto) */}
                      <Box overflowX="auto" w="100%">
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
                    </TabPanel>
                    <TabPanel w="100%">
                      <Text color="gray.600">KPIs coming soon.</Text>
                    </TabPanel>
                    <TabPanel w="100%">
                      <Text color="gray.600">Tests coming soon.</Text>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </>
            )}
          </CardBody>
        </Card>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
