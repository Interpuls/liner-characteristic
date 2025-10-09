// pages/admin/tests.js
import { useEffect, useState } from "react";
import {
  Box, Heading, HStack, VStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  Card, CardBody, SimpleGrid, Text, Badge, Icon
} from "@chakra-ui/react";
import { LuFlaskConical } from "react-icons/lu";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

import AppHeader from "@/components/AppHeader";
import FancySelect from "@/components/ui/FancySelect";

import { BackHomeIcon } from "../../components/ui/BackHomeIcon";
import { getToken } from "@/lib/auth";
import { listProducts, getProduct, listProductApplications } from "@/lib/api";

const L = ({ children }) => <Text fontSize="xs" color="gray.500" mb={1}>{children}</Text>;

// Piccolo box informativo usato sotto ogni Tab
function InfoBox({ children }) {
  return (
    <Box mb={4} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
      <Text fontSize="sm" color="gray.700">{children}</Text>
    </Box>
  );
}

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
          <V label="Shell Orifice" value={product.shell_orifice} />
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
    <>
      <AppHeader
        title="Tests Campaign"
        subtitle="Laboratory workspace on your selected product."
        leftIcon={LuFlaskConical}
        backHref="/"
        showInfo={false}
      />
      <Box as="main" maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} pt={4}>
        
      {/* Selettore prodotto (unico per tutti i tab) */}
      <Card mb={3}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <L>Select product</L>
              <FancySelect
                placeholder="Choose a product"
                value={pid}
                onChange={(val) => setPid(val)}
                options={products.map((p) => ({
                  value: String(p.id),
                  label: (p.brand ? `${p.brand} ` : "") + (p.model || p.name || `#${p.id}`) + (p.compound ? ` (${p.compound})` : ""),
                }))}
                w="full"
              />
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
            <InfoBox>
              TPP — Calcola il KPI “Closure” partendo dal valore reale di TPP.
              Seleziona il prodotto, poi per ciascuna misura inserisci il Real TPP (mm)
              e premi “Save & Compute”.
            </InfoBox>
            <TppTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox>
              Massage — Registra i valori min/max alle tre pressioni (45/40/35 kPa),
              calcola metriche derivate e i KPI di rischio/fitting. Compila tutti i campi
              per ciascuna misura e premi “Save & Compute”.
            </InfoBox>
            <AdminMassageTest token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox>
              Speed — Calcola il KPI “Speed” a partire dal volume misurato (ml).
              Inserisci il valore misurato per ciascuna misura e premi “Save & Compute”.
            </InfoBox>
            <SpeedTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox>
              SMT / Hood — Inserisci SMT min/max e HOOD min/max ai tre flussi (0.5 / 1.9 / 3.6 L/min).
              Il sistema calcola le metriche per flusso (Respray, Fluydodinamic, Slippage, Ringing risk)
              e i KPI medi. Completa tutti i campi e premi “Save & Compute”.
            </InfoBox>
            <SmtHoodTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
    </>
  );
}
