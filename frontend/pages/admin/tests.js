// pages/admin/tests.js
import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box, Heading, HStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  Card, CardBody, SimpleGrid, Select, Text, Spinner
} from "@chakra-ui/react";
import { BackHomeIcon } from "../../components/ui/BackHomeIcon";
import { getToken } from "../../lib/auth";
import { listProducts, getProduct, listProductApplications } from "../../lib/api";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

export default function AdminTests() {
  const [token, setToken] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [pid, setPid] = useState("");             // product id selezionato
  const [product, setProduct] = useState(null);   // dettaglio prodotto
  const [apps, setApps] = useState([]);           // applicazioni del prodotto
  const [appsLoading, setAppsLoading] = useState(false);

  // bootstrap: token + elenco prodotti
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);

    (async () => {
      try {
        setProductsLoading(true);
        const rows = await listProducts(t, { product_type: "liner", limit: 200 }).catch(() => []);
        const items = Array.isArray(rows) ? rows : (rows?.items ?? []);
        setProducts(items);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  // quando scelgo il prodotto: carico dettaglio + applicazioni
  useEffect(() => {
    if (!token || !pid) { setProduct(null); setApps([]); return; }
    (async () => {
      try {
        setAppsLoading(true);
        const [p, pas] = await Promise.all([
          getProduct(token, pid),
          listProductApplications(token, pid)
        ]);
        setProduct(p || null);
        const arr = Array.isArray(pas) ? pas.slice().sort((a,b)=>a.size_mm-b.size_mm) : [];
        setApps(arr);
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [token, pid]);

  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      <HStack gap={3} mb={4}>
        <BackHomeIcon />
        <Heading size="lg">Tests Campaign</Heading>
      </HStack>

      {/* Select prodotto sempre visibile, sopra i Tab */}
      <Card mb={4}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Select product</Text>
              <Select
                placeholder={productsLoading ? "Loading…" : "Choose a product"}
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                isDisabled={productsLoading}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.brand ? `${p.brand} ` : "") + (p.model || p.name || `#${p.id}`)}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>
          {pid && appsLoading && (
            <HStack mt={3} color="gray.500"><Spinner size="sm" /><Text>Loading applications…</Text></HStack>
          )}
        </CardBody>
      </Card>

      <Tabs colorScheme="blue" variant="line">
        <TabList overflowX="auto" borderBottom="1px" borderColor="gray.200">
          <Tab _selected={{ borderBottom: "2px solid", borderColor: "blue.500", fontWeight: "bold", color: "blue.600" }}>TPP</Tab>
          <Tab _selected={{ borderBottom: "2px solid", borderColor: "blue.500", fontWeight: "bold", color: "blue.600" }}>Massage</Tab>
          <Tab _selected={{ borderBottom: "2px solid", borderColor: "blue.500", fontWeight: "bold", color: "blue.600" }}>Speed</Tab>
          <Tab _selected={{ borderBottom: "2px solid", borderColor: "blue.500", fontWeight: "bold", color: "blue.600" }}>SMT / Hood</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={4}>
            <TppTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <AdminMassageTest token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <SpeedTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <SmtHoodTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
