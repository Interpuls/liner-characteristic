// pages/admin/tests.js
import { useEffect, useState } from "react";
import {
  Box, Heading, HStack, VStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  Card, CardBody, SimpleGrid, Select, Text, Badge, Icon
} from "@chakra-ui/react";
import { LuFlaskConical } from "react-icons/lu";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

import { BackHomeIcon } from "../../components/ui/BackHomeIcon";
import { getToken } from "@/lib/auth";
import { listProducts, getProduct, listProductApplications } from "@/lib/api";

const L = ({ children }) => <Text fontSize="xs" color="gray.500" mb={1}>{children}</Text>;

function ProductSpecsCard({ product }) {
  if (!product) return null;
  const V = ({ label, value, unit }) => (
    <Box>
      <L>{label}</L>
      <Text>{value ?? "—"}{value != null && unit ? ` ${unit}` : ""}</Text>
    </Box>
  );
  return (
    <Card mb={4} variant="outline">
      <CardBody>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Badge colorScheme="blue" variant="subtle" borderRadius="md">Product</Badge>
            <Text fontWeight="semibold">
              {(product.brand ? `${product.brand} ` : "") + (product.model || product.name || `#${product.id}`)}
            </Text>
          </HStack>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <V label="MP depth" value={product.mp_depth_mm} unit="mm" />
          <V label="Orifice Ø" value={product.orifice_diameter} unit="mm" />
          <V label="Hoodcup Ø" value={product.hoodcup_diameter} unit="mm" />
          <V label="Return → lockring" value={product.return_to_lockring} unit="mm" />
          <V label="Lockring Ø" value={product.lockring_diameter} unit="mm" />
          <V label="Overall length" value={product.overall_length} unit="mm" />
          <V label="Milk tube ID" value={product.milk_tube_id} unit="mm" />
          <V label="Barrel wall th." value={product.barrell_wall_thickness} unit="mm" />
          <V label="Barrel conicity" value={product.barrell_conicity} />
          <V label="Hardness" value={product.hardness} />
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}

export default function AdminTests() {
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [pid, setPid] = useState("");
  const [product, setProduct] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
    (async () => {
      try {
        const rows = await listProducts(t, { product_type: "liner", limit: 100 });
        const items = Array.isArray(rows) ? rows : (rows?.items ?? []);
        setProducts(items);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token || !pid) { setProduct(null); setApps([]); return; }
    (async () => {
      try {
        const [p, pas] = await Promise.all([
          getProduct(token, pid),
          listProductApplications(token, pid),
        ]);
        setProduct(p || null);
        setApps(Array.isArray(pas) ? pas.sort((a,b)=>a.size_mm-b.size_mm) : []);
      } catch {
        setProduct(null); setApps([]);
      }
    })();
  }, [pid, token]);

  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      {/* Header: freccia + (titolo con ampolla + sottotitolo) */}
      <HStack align="center" spacing={3} mb={3}>
        <BackHomeIcon />
        <VStack align="start" spacing={1}>
          <HStack spacing={2}>
            <Icon as={LuFlaskConical} boxSize={7} color="grey.500" />
            <Heading size="lg">Tests Campaign</Heading>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            Laboratory workspace for Milkrite InterPuls liners: run TPP, Massage, Speed, and SMT/Hood tests on your selected product.
          </Text>
        </VStack>
      </HStack>

      {/* Selettore prodotto (unico per tutti i tab) */}
      <Card mb={3}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <L>Select product</L>
              <Select
                placeholder="Choose a product"
                value={pid}
                onChange={(e) => setPid(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.brand ? `${p.brand} ` : "") + (p.model || p.name || `#${p.id}`) + (p.compound ? ` (${p.compound}) ` : " ")}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Scheda specifiche del prodotto selezionato */}
      {pid && <ProductSpecsCard product={product} />}

      {/* Tabs */}
      <Tabs variant="unstyled">
        <TabList
          overflowX="auto"
          borderBottom="1px solid"
          borderColor="gray.200"
          css={{
            scrollbarWidth: "none",      /* Firefox */
            msOverflowStyle: "none",     /* IE/Edge */
            "&::-webkit-scrollbar": { display: "none" }, /* Chrome/Safari */
          }}
        >
          {["TPP", "Massage", "Speed", "SMT / Hood"].map((label) => (
            <Tab
              key={label}
              borderBottom="2px solid transparent"
              borderRadius="0"
              px={4}
              py={3}
              mr={2}
              whiteSpace="nowrap"
              _selected={{
                color: "blue.600",
                fontWeight: "bold",
                borderBottomColor: "blue.500",
              }}
              _focus={{ boxShadow: "none" }}
            >
              {label}
            </Tab>
          ))}
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
