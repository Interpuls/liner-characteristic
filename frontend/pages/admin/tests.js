import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Box, Heading, HStack, Button, Select, Input, Stack, Card, CardBody, CardHeader,
  SimpleGrid, Tag, TagLabel, Text, Badge, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
  InputGroup, InputLeftAddon, Spinner, Tooltip, Stat, StatLabel, StatNumber, Icon
} from "@chakra-ui/react";
import { ChevronLeftIcon, AddIcon } from "@chakra-ui/icons";
import { LuCalculator } from "react-icons/lu";
import { getToken } from "../../lib/auth";
import { listProducts,  getTppRunKpis } from "../../lib/api";
import {
  listProductApplications, getProduct,
  createTppRun, computeTppRun, listTppRuns
} from "../../lib/api";

import AdminMassageTest from "./tests/massage";

const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "green.400" :
  s === 2 ? "yellow.500" :
  s === 1 ? "red.500" : "gray.500";

const scoreLabel = (s) =>
  s >= 4 ? "Best" :
  s === 3 ? "Good" :
  s === 2 ? "Fair" :
  s === 1 ? "Poor" : "—";

function TppRow({ pa, product, token, onDone }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(null); // Closure score se presente

useEffect(() => {
  if (!token || !pa?.id) return;
  (async () => {
    try {
      // 1) prendo l'ULTIMO run per questa application
      const runs = await listTppRuns(token, { product_application_id: pa.id });
      const lastRun = Array.isArray(runs) && runs.length ? runs[0] : null;
      if (lastRun) {
        // prefilla l'input se c'è un valore salvato
        if (lastRun.real_tpp != null) setValue(String(lastRun.real_tpp));

        // 2) carico i KPI di quel run e cerco CLOSURE finale
        try {
          const kpis = await getTppRunKpis(token, lastRun.id);
          const closure = (kpis || []).find((k) => {
            if (k.kpi_code !== "CLOSURE") return false;
            // context_json può essere null o avere spazi → controllo "agg":"final"
            const ctx = k.context_json || "";
            return typeof ctx === "string" && ctx.includes('"agg"') && ctx.includes("final");
          });
          if (closure) setScore(closure.score);
        } catch {
          // se l'endpoint KPI non c'è ancora, ignora; lo vedrai dopo il primo compute
        }
      }
    } catch {
      // nessun run salvato finora: lascia campi vuoti
    }
  })();
}, [token, pa?.id]);



  const onSaveCompute = async () => {
    const realVal = parseFloat(String(value).replace(",", "."));
    if (Number.isNaN(realVal)) {
      toast({ title: "Inserisci un numero valido", status: "warning" });
      return;
    }
    try {
      setSaving(true);
      // 1) salva run
      const run = await createTppRun(token, {
        product_application_id: pa.id,
        real_tpp: realVal
      });
      // 2) compute
      const kpis = await computeTppRun(token, run.id);
      const closure = kpis?.find?.(k => k.kpi_code === "CLOSURE");
      if (closure) setScore(closure.score);
      toast({ title: "Salvato e calcolato", status: "success" });
      onDone?.();
    } catch (err) {
      toast({ title: "Errore salvataggio/calcolo", description: err?.message, status: "error" });
    } finally {
      setSaving(false);
    }
  };

  // campi tecnici (placeholder: se non presenti a schema, mostrali solo se esistono)
  const mpDepth = product?.mp_depth_mm ?? null; // es: presa dalle specifiche del prodotto

  return (
    <Card variant="outline">
      <CardHeader pb="2">
        <HStack justify="space-between">
          <HStack>
            <Heading size="sm">{product?.model ?? "Model"}</Heading>
            <Tag size="sm" variant="subtle"><TagLabel>{product?.brand ?? "-"}</TagLabel></Tag>
          </HStack>
          <Tag size="sm" colorScheme="blue"><TagLabel>{pa.size_mm} mm</TagLabel></Tag>
        </HStack>
      </CardHeader>
      <CardBody pt="0">
        <Stack spacing={3}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>MP depth (product)</Text>
              <Text>{mpDepth != null ? `${mpDepth} mm` : "-"}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>Real TPP</Text>
              <InputGroup>
                <InputLeftAddon>mm</InputLeftAddon>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter measured Real TPP"
                  isDisabled={saving}
                  
                />
              </InputGroup>
            </Box>
            <Box >
              <Text fontSize="xs" color="gray.500" mb={1}>Closure</Text>
              <Tooltip
                label={score != null ? `Score: ${scoreLabel(score)} (${score}/4)` : "Not computed yet"}
                hasArrow
                placement="top"
              >
                <Stat p={2} borderWidth="1px" borderRadius="md" backgroundColor={scoreColor(score)} textAlign={"center"}>
                  <StatNumber fontSize="l" color="white">
                    {score != null ? score : "—"}
                  </StatNumber>
                </Stat>
              </Tooltip>
            </Box>
          </SimpleGrid>
          <HStack justify="flex-end">
            <Button onClick={onSaveCompute} colorScheme="blue" isLoading={saving} leftIcon={<LuCalculator />}>
              Save & Compute
            </Button>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
}

function TabTPP() {
  const toast = useToast();
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [pid, setPid] = useState(""); // product id scelto
  const [product, setProduct] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  // bootstrap
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
    // prendo la lista prodotti per la select (limit base…)
    listProducts(t, { product_type: "liner", limit: 100 })
      .then((items) => setProducts(Array.isArray(items) ? items : (items?.items ?? [])))
      .catch(() => setProducts([]));
  }, []);

  // quando scelgo un prodotto carico dettagli + le applicazioni
  useEffect(() => {
    if (!token || !pid) { setProduct(null); setApps([]); return; }
    (async () => {
      try {
        setLoading(true);
        const [p, pas] = await Promise.all([
          getProduct(token, pid),
          listProductApplications(token, pid)
        ]);
        setProduct(p || null);
        setApps(Array.isArray(pas) ? pas.sort((a, b) => a.size_mm - b.size_mm) : []);
      } catch (err) {
        toast({ title: "Errore caricamento prodotto/applicazioni", status: "error" });
        setApps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [pid, token]);

  return (
    <Box>
      <Card mb={4}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Select product</Text>
              <Select placeholder="Choose a product" value={pid} onChange={(e) => setPid(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.brand ? `${p.brand} ` : "") + (p.model || p.name || `#${p.id}`)}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {loading ? (
        <HStack justify="center" py={12}><Spinner /></HStack>
      ) : pid && apps.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {apps.map((pa) => (
            <TppRow key={pa.id} pa={pa} product={product} token={token} onDone={() => { /* in futuro refetch KPI */ }} />
          ))}
        </SimpleGrid>
      ) : pid ? (
        <Box py={8} textAlign="center" color="gray.500">No applications for this product.</Box>
      ) : (
        <Box py={8} textAlign="center" color="gray.500">Select a product to start.</Box>
      )}
    </Box>
  );
}

export default function AdminTests() {
  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      <HStack gap={3} mb={4}>
        <Button as={NextLink} href="/home" variant="outline" size="sm">
          <ChevronLeftIcon mr={1} /> Home
        </Button>
        <Heading size="lg">Tests Campaign</Heading>
      </HStack>

      <Tabs colorScheme="blue">
        <TabList overflowX="auto">
          <Tab>TPP</Tab>
          <Tab>Massage</Tab>
          <Tab>Speed</Tab>
          <Tab>SMT / Hood</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={4}>
            <TabTPP />
          </TabPanel>
          <TabPanel><AdminMassageTest></AdminMassageTest></TabPanel>
          <TabPanel><Box p={4} color="gray.500">Coming next…</Box></TabPanel>
          <TabPanel><Box p={4} color="gray.500">Coming next…</Box></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
