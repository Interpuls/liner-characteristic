// pages/idcard/idresult.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Button,
  Card, CardHeader, CardBody, Table, Thead, Tbody, Tr, Th, Td, useToast,
  Tag, TagLabel, Tabs, TabList, TabPanels, Tab, TabPanel, Divider
} from "@chakra-ui/react";
import { TbListDetails, TbGauge } from "react-icons/tb";
import { RiFlaskLine } from "react-icons/ri";
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
        toast({ status: "warning", title: "No model selected." });
        router.replace("/product/result");
        return;
      }

      try {
        setLoading(true);
        const items = await listProducts(t, { brand, model, limit: 1 });
        const p = Array.isArray(items) ? items[0] : null;
        if (!p) {
          toast({ status: "info", title: "No products found for the selected filters." });
        }
        setProduct(p || null);
      } catch (e) {
        toast({ status: "error", title: "Error loading product." });
      } finally {
        setLoading(false);
      }
    })();
  }, [me, router.isReady, brand, model, toast, router]);

  if (!me) return <Box p={6}>Caricamento…</Box>;

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title={product?.model || ""}
        subtitle={product?.brand ? `Product belonging to the ${product.brand} brand` : ""}
        backHref={backHref}
        showInfo={false}
      />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }} w="100%">
        {/* Dettaglio prodotto */}
        <Card
          w="100%"
          ml={{ base: 0, md: 0 }}
          mr={{ base: 0, md: 0 }}
          borderWidth={0}
          rounded={{ base: "none", md: "md" }}
          boxShadow={{ base: "none", md: "sm" }}
        >
          <CardBody pt={3}>
            {loading ? (
              <Text py={8} color="gray.600">Caricamento…</Text>
            ) : !product ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">Nessun prodotto corrispondente.</Text>
                <Button onClick={() => router.push(backHref)} variant="outline">Torna ai risultati</Button>
              </VStack>
            ) : (
              <>
                {/* Product image */}
                <Box w="100%" display="flex" justifyContent="center" mb={4}>
                  <Box as="img" src="/liner.png" alt="Liner" maxH="180px" objectFit="contain" />
                </Box>

                {/* Tabs: Details | KPIs | Tests */}
                <Tabs colorScheme="blue" mt={2} w="100%" isFitted variant="enclosed">
                  <TabList borderRadius="md" borderWidth="1px" overflow="hidden" bg="gray.50">
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={TbListDetails} /> <Text>Details</Text></HStack>
                    </Tab>
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={TbGauge} /> <Text>KPIs</Text></HStack>
                    </Tab>
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={RiFlaskLine} /> <Text>Tests</Text></HStack>
                    </Tab>
                  </TabList>
                  <TabPanels w="100%">
                    <TabPanel px={0} w="100%">
                      {/* Specifications table */}
                      <Box overflowX="auto" w="100%" borderWidth="1px" borderRadius="md" bg="white">
                        <Table size="sm" variant="striped" colorScheme="gray">
                          <Thead>
                            <Tr>
                              <Th w="40%">Property</Th>
                              <Th>Value</Th>
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
                      <VStack spacing={3} py={2} align="center" color="gray.600">
                        <Box as={TbGauge} boxSize={8} />
                        <Text>KPIs coming soon.</Text>
                      </VStack>
                    </TabPanel>
                    <TabPanel w="100%">
                      <VStack spacing={3} py={2} align="center" color="gray.600">
                        <Box as={RiFlaskLine} boxSize={8} />
                        <Text>Tests coming soon.</Text>
                      </VStack>
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
