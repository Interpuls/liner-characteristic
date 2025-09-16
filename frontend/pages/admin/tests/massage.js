import { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, Card, CardHeader, CardBody, Text,
  HStack, VStack, Input, Button, Divider, Spinner, Tag, TagLabel,
  Stat, StatNumber, Tooltip, Select, useToast, Heading
} from "@chakra-ui/react";
import { getToken } from "@/lib/auth";
import {
  listProducts, listProductApplications,
  getKpiValuesByPA, getLatestMassageRun,
  createMassageRun, computeMassageRun, updateMassagePoints
} from "@/lib/api";
import { FaCalculator } from "react-icons/fa";

const PRESSURES = [45, 40, 35];
const MASSAGE_COLOR = "teal";

// score helpers (coerenti con TPP/Speed)
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

// formatter
const fmtNum = (v) =>
  v == null ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) =>
  v == null ? "—" : Number(v).toLocaleString("it-IT", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function MassageTestPage() {
  const toast = useToast();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [applications, setApplications] = useState([]);
  const [fetchingApps, setFetchingApps] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await listProducts(token, { product_type: "liner", limit: 100 });
        const items = Array.isArray(rows) ? rows : (rows?.items ?? []);
        setProducts(items);
      } catch (e) {
        toast({ title: "Errore caricamento prodotti", status: "error" });
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProductId) { setApplications([]); return; }
    (async () => {
      setFetchingApps(true);
      try {
        const apps = await listProductApplications(token, selectedProductId);
        setApplications(Array.isArray(apps) ? apps.sort((a,b)=>a.size_mm-b.size_mm) : []);
      } catch {
        setApplications([]);
      } finally {
        setFetchingApps(false);
      }
    })();
  }, [token, selectedProductId]);

  return (
    <Box>
      {/* Heading rimosso come richiesto */}

      {/* Selettore prodotto in Card, come TPP/Speed */}
      <Card mb={4}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Select product</Text>
              <Select
                placeholder="Choose a product"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                isDisabled={loading}
              >
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

      {loading && (
        <HStack><Spinner /><Text>Loading products…</Text></HStack>
      )}

      {fetchingApps && (
        <HStack><Spinner /><Text>Loading applications…</Text></HStack>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {applications.map((pa) => (
          <MassageCard key={pa.id} token={token} application={pa} />
        ))}
      </SimpleGrid>

      {!loading && selectedProductId && applications.length === 0 && (
        <Box py={8} textAlign="center" color="gray.500">No applications for this product.</Box>
      )}
      {!loading && !selectedProductId && (
        <Box py={8} textAlign="center" color="gray.500">Select a product to start.</Box>
      )}
    </Box>
  );
}

function MassageCard({ token, application }) {
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(PRESSURES.map(k => [k, { min_val: "", max_val: "" }]))
  );
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [busy, setBusy] = useState(true);
  const [runId, setRunId] = useState(null);

  // Prefill: ultimo run + KPI per application
  useEffect(() => {
    if (!token || !application?.id) return;
    (async () => {
      setBusy(true);
      try {
        const values = await getKpiValuesByPA(token, application.id);
        const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
        setKpis(map);

        const latest = await getLatestMassageRun(token, application.id);
        if (latest?.run?.id) {
          setRunId(latest.run.id);
          const next = { 45:{min_val:"",max_val:""}, 40:{min_val:"",max_val:""}, 35:{min_val:"",max_val:""} };
          for (const p of latest.run.points || []) {
            const k = Number(p.pressure_kpa);
            if (PRESSURES.includes(k)) {
              next[k] = { min_val: String(p.min_val), max_val: String(p.max_val) };
            }
          }
          setInputs(next);
        } else {
          setRunId(null);
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [token, application?.id]);

  const canCompute = useMemo(() => {
    return PRESSURES.every(k => {
      const v = inputs[k];
      return v && v.min_val !== "" && v.max_val !== "";
    });
  }, [inputs]);

  const onChange = (kpa, field, val) => {
    setInputs(prev => ({ ...prev, [kpa]: { ...prev[kpa], [field]: val } }));
  };

  const onSaveAndCompute = async () => {
    if (!token || !canCompute) return;
    setSaving(true);
    try {
      const points = PRESSURES.map(k => ({
        pressure_kpa: k,
        min_val: Number(inputs[k].min_val),
        max_val: Number(inputs[k].max_val),
      }));

      let currentRunId = runId;

      if (currentRunId) {
        await updateMassagePoints(token, currentRunId, points);
      } else {
        const run = await createMassageRun(token, {
          product_application_id: application.id,
          points,
          notes: "from UI",
        });
        currentRunId = run.id;
        setRunId(run.id);
      }

      const res = await computeMassageRun(token, currentRunId);
      setMetrics(res.metrics || null);

      const values = await getKpiValuesByPA(token, application.id);
      const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
      setKpis(map);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outline">
      <CardHeader>
        <HStack justify="space-between" align="center">
          {/* SOLO application size come chip/tag arrotondato */}
          <Tag size="sm" colorScheme={MASSAGE_COLOR} variant="subtle" borderRadius="md">
            <TagLabel>{application.size_mm} mm</TagLabel>
          </Tag>
          {busy && <Spinner size="sm" />}
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {/* Inputs per le tre pressioni */}
          {PRESSURES.map((k) => (
            <Box key={k} p={3} borderWidth="1px" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">{k} kPa</Text>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Min</Text>
                  <Input
                    type="number"
                    value={inputs[k].min_val}
                    onChange={(e) => onChange(k, "min_val", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Max</Text>
                  <Input
                    type="number"
                    value={inputs[k].max_val}
                    onChange={(e) => onChange(k, "max_val", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
              </SimpleGrid>
            </Box>
          ))}

          <HStack justify="flex-end">
            <Button
              leftIcon={<FaCalculator />}
              colorScheme={MASSAGE_COLOR}
              onClick={onSaveAndCompute}
              isDisabled={!canCompute || saving}
              isLoading={saving}
            >
              Save & Compute
            </Button>
          </HStack>

          <Divider />

          {/* Derived metrics */}
          <Box>
            <Heading size="sm" mb={2}>Derived metrics</Heading>
            {metrics ? (
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                {metricChipBox("I45", metrics.I45, "num")}
                {metricChipBox("I40", metrics.I40, "num")}
                {metricChipBox("I35", metrics.I35, "num")}
                {metricChipBox("AVG Overmilk", metrics.avg_overmilk, "num")}
                {metricChipBox("AVG PF", metrics.avg_pf, "num")}
                {metricChipBox("Diff from max (kPa)", metrics.diff_from_max, "num")}
                {metricChipBox("Diff %", metrics.diff_pct, "pct")}
                {metricChipBox("Drop 45→40", metrics.drop_45_to_40, "pct")}
                {metricChipBox("Drop 40→35", metrics.drop_40_to_35, "pct")}
              </SimpleGrid>
            ) : (
              <Text color="gray.500">No metrics yet.</Text>
            )}
          </Box>

          {/* KPIs */}
          <Box>
            <Heading size="sm" mb={2}>KPIs</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <KpiBox title="Congestion risk" k={kpis?.CONGESTION_RISK} />
              <KpiBox title="Hyperkeratosis risk" k={kpis?.HYPERKERATOSIS_RISK} />
              <KpiBox title="Fitting" k={kpis?.FITTING} />
            </SimpleGrid>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}

// “chip” + valore a sinistra (formattazione custom)
function metricChipBox(label, value, kind /* 'num' | 'pct' */) {
  const display = kind === "pct" ? fmtPct(value) : fmtNum(value);
  return (
    <Box>
      <Tag size="sm" variant="subtle" colorScheme={MASSAGE_COLOR} borderRadius="md" mb={1}>
        <TagLabel>{label}</TagLabel>
      </Tag>
      <Text>{display}</Text>
    </Box>
  );
}

function KpiBox({ title, k }) {
  const score = k?.score ?? null;
  const rawVal = k?.value_num ?? null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>{title}</Text>
      <Tooltip
        label={
          score != null
            ? `Score: ${scoreLabel(score)} (${score}/4) — value: ${rawVal != null ? rawVal : "n/a"}`
            : "Not computed yet"
        }
        hasArrow
      >
        <Stat p={2} borderWidth="1px" borderRadius="md" bg={scoreColor(score)} textAlign="center">
          <StatNumber fontSize="xl" color="white">
            {score != null ? score : "—"}
          </StatNumber>
        </Stat>
      </Tooltip>
    </Box>
  );
}
