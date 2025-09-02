import { useEffect, useMemo, useState } from "react";
import {
  Box, Heading, SimpleGrid, Card, CardHeader, CardBody, Text,
  HStack, VStack, Input, Button, Divider, Spinner, Tag, Stat, StatNumber, Tooltip,
} from "@chakra-ui/react";
import { getToken } from "@/lib/auth";
import { listProducts, listProductApplications } from "@/lib/api"; // già esistenti
import { listMassageRuns, createMassageRun, computeMassageRun, getKpiValuesByPA } from "@/lib/api";
import { FaCalculator } from "react-icons/fa";

const PRESSURES = [45, 40, 35];

function scoreColor(score) {
  if (score == null) return "gray.400";
  if (score === 4) return "green.500";
  if (score === 3) return "green.400";
  if (score === 2) return "yellow.400";
  return "red.400";
}
function scoreLabel(s) {
  if (s == null) return "N/A";
  return `${s}/4`;
}

export default function MassageTestPage() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fetchingApps, setFetchingApps] = useState(false);

  useEffect(() => {
    setToken(getToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await listProducts(token, { limit: 200, offset: 0 }); // o il tuo fetch principale
        setProducts(rows || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProductId) return;
    (async () => {
      setFetchingApps(true);
      try {
        const apps = await listProductApplications(token, selectedProductId);
        setApplications(apps || []);
      } finally {
        setFetchingApps(false);
      }
    })();
  }, [token, selectedProductId]);

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>Massage test</Heading>

      {loading ? (
        <HStack><Spinner /><Text>Loading products…</Text></HStack>
      ) : (
        
        <HStack mb={4} wrap="wrap" gap={3}>
          <Text fontWeight="semibold">Product:</Text>
          <select
            value={selectedProductId || ""}
            onChange={(e) => setSelectedProductId(Number(e.target.value) || null)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.model || p.name} {p.brand ? `– ${p.brand}` : ""}
              </option>
            ))}
          </select>
        </HStack>
      )}

      {fetchingApps && (
        <HStack><Spinner /><Text>Loading applications…</Text></HStack>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {applications.map((pa) => (
          <MassageCard key={pa.id} token={token} application={pa} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function MassageCard({ token, application }) {
  // inputs per pressione
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(PRESSURES.map(k => [k, { min_val: "", max_val: "" }]))
  );

  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [busy, setBusy] = useState(true);

  // prefill: prendi ultimo run + kpi values
  useEffect(() => {
    if (!token) return;
    (async () => {
      setBusy(true);
      try {
        // 1) KPI values
        const values = await getKpiValuesByPA(token, application.id);
        const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
        setKpis(map);

        // 2) ultimo run per precompilare
        const runs = await listMassageRuns(token, { productApplicationId: application.id, limit: 1, offset: 0 });
        if (runs && runs.length > 0) {
          // opzionalmente puoi prevedere /massage/runs/{id}/points, ma non serve:
          // i punti li hai salvati nel POST di create_massage_run nella risposta?
          // In questa implementazione lato BE la lista runs non include i punti,
          // quindi qui non possiamo precompilare senza un endpoint aggiuntivo.
          // -> Workaround: lascia vuoto se manca endpoint; i KPI però si vedono comunque.
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [token, application?.id]);

  const canCompute = useMemo(() => {
    // richiedi i tre blocchi completi
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
      // 1) create run
      const points = PRESSURES.map(k => ({
        pressure_kpa: k,
        min_val: Number(inputs[k].min_val),
        max_val: Number(inputs[k].max_val),
      }));
      const run = await createMassageRun(token, {
        product_application_id: application.id,
        points,
        notes: "from UI",
      });

      // 2) compute
      const res = await computeMassageRun(token, run.id);
      setMetrics(res.metrics || null);

      // 3) refresh KPI values appena calcolati
      const values = await getKpiValuesByPA(token, application.id);
      const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
      setKpis(map);
    } finally {
      setSaving(false);
    }
  };

  const closureBox = (label, value) => (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>{label}</Text>
      <Text>{value != null ? value : "—"}</Text>
    </Box>
  );

  return (
    <Card variant="outline">
      <CardHeader>
        <HStack justify="space-between">
          <HStack>
            <Heading size="sm">{application.size_mm} mm</Heading>
            {application.label && <Tag size="sm">{application.label}</Tag>}
          </HStack>
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
              colorScheme="blue"
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
                {closureBox("I45", metrics.I45?.toFixed(2))}
                {closureBox("I40", metrics.I40?.toFixed(2))}
                {closureBox("I35", metrics.I35?.toFixed(2))}
                {closureBox("AVG Overmilk", metrics.avg_overmilk?.toFixed(2))}
                {closureBox("AVG PF", metrics.avg_pf?.toFixed(2))}
                {closureBox("Diff from max (kPa)", metrics.diff_from_max?.toFixed(2))}
                {closureBox("Diff %", metrics.diff_pct?.toFixed(3))}
                {closureBox("Drop 45→40", metrics.drop_45_to_40?.toFixed(3))}
                {closureBox("Drop 40→35", metrics.drop_40_to_35?.toFixed(3))}
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

function KpiBox({ title, k }) {
  const score = k?.score ?? null;
  const rawVal = k?.value_num ?? null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>{title}</Text>
      <Tooltip
        label={
          score != null
            ? `Score: ${scoreLabel(score)}  — value: ${rawVal != null ? rawVal : "n/a"}`
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
