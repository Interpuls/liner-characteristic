import { useEffect, useMemo, useState } from "react";
import {
  Box, Heading, SimpleGrid, Card, CardHeader, CardBody, Text,
  HStack, VStack, Input, Button, Divider, Spinner, Tag, Stat, StatNumber,
  Tooltip, IconButton
} from "@chakra-ui/react";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import { FaCalculator } from "react-icons/fa";

import { getToken } from "@/lib/auth";
import {
  listProducts,
  listProductApplications,
  getKpiValuesByPA,
  // 👇 assicurati che esistano in lib/api.js
  getLatestSpeedRun,
  createSpeedRun,
  upsertSpeedMeasures,
  computeSpeedRun,
} from "@/lib/api";

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

/**
 * Componente principale (montalo dentro admin/product come fatto per Massage)
 */
export default function SpeedTestPage() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fetchingApps, setFetchingApps] = useState(false);

  useEffect(() => setToken(getToken()), []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await listProducts(token, { limit: 500, offset: 0 });
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
      <Heading size="lg" mb={4}>Speed test</Heading>

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
          <SpeedCard key={pa.id} token={token} application={pa} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

/**
 * Card per singola teat size (application). Gestisce:
 * - prefill misure dall’ultimo run
 * - inserimento volumi (ml) per sample_no
 * - Save & Compute (crea run se manca oppure aggiorna solo measures)
 * - mostra metrics e KPI SPEED
 */
function SpeedCard({ token, application }) {
  // measures: array di { sample_no, volume_ml } — partiamo con 3 righe
  const [measures, setMeasures] = useState([
    { sample_no: 1, volume_ml: "" },
    { sample_no: 2, volume_ml: "" },
    { sample_no: 3, volume_ml: "" },
  ]);

  const [runId, setRunId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);

  const [metrics, setMetrics] = useState(null);
  const [kpis, setKpis] = useState(null);

  // prefill: ultimo run + KPI values
  useEffect(() => {
    if (!token) return;
    (async () => {
      setBusy(true);
      try {
        // KPI
        const values = await getKpiValuesByPA(token, application.id);
        const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
        setKpis(map);

        // Ultimo run → prefill measures
        const latest = await getLatestSpeedRun(token, application.id);
        if (latest?.run?.id) {
          setRunId(latest.run.id);
          const rows = (latest.run.measures || [])
            .slice() // copia
            .sort((a, b) => a.sample_no - b.sample_no)
            .map(m => ({ sample_no: m.sample_no, volume_ml: String(m.volume_ml ?? "") }));
          if (rows.length) setMeasures(rows);
        } else {
          setRunId(null);
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [token, application?.id]);

  const canCompute = useMemo(() => {
    if (!measures.length) return false;
    return measures.every(m =>
      m.sample_no != null &&
      m.sample_no !== "" &&
      m.volume_ml !== "" &&
      !Number.isNaN(Number(m.volume_ml))
    );
  }, [measures]);

  const setRow = (idx, patch) => {
    setMeasures(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const addRow = () => {
    const nextNo = (measures.at(-1)?.sample_no ?? 0) + 1;
    setMeasures(prev => [...prev, { sample_no: nextNo, volume_ml: "" }]);
  };
  const removeRow = (idx) => {
    setMeasures(prev => prev.filter((_, i) => i !== idx));
  };

  const onSaveAndCompute = async () => {
    if (!token || !canCompute) return;
    setSaving(true);
    try {
      const clean = measures.map(m => ({
        sample_no: Number(m.sample_no),
        volume_ml: Number(m.volume_ml),
      }));

      let currentRunId = runId;
      if (currentRunId) {
        await upsertSpeedMeasures(token, currentRunId, clean);
      } else {
        const run = await createSpeedRun(token, {
          product_application_id: application.id,
          measures: clean,
          notes: "from UI",
        });
        currentRunId = run.id;
        setRunId(run.id);
      }

      const res = await computeSpeedRun(token, currentRunId);
      setMetrics(res?.metrics ?? null);

      // refresh KPI values (SPEED)
      const values = await getKpiValuesByPA(token, application.id);
      const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
      setKpis(map);
    } finally {
      setSaving(false);
    }
  };

  const metricBox = (label, value) => (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>{label}</Text>
      <Text>{value != null && value !== "" ? value : "—"}</Text>
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
          {/* Tabella input campioni */}
          <Box borderWidth="1px" borderRadius="md" p={3}>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Samples (ml)</Text>
              <HStack>
                <IconButton
                  aria-label="Add sample"
                  icon={<AddIcon />}
                  size="sm"
                  onClick={addRow}
                  isDisabled={saving}
                />
              </HStack>
            </HStack>

            <VStack align="stretch" spacing={2}>
              {measures.map((row, idx) => (
                <HStack key={idx} align="center">
                  <Box minW="80px">
                    <Text fontSize="xs" color="gray.500" mb={1}>#</Text>
                    <Input
                      type="number"
                      value={row.sample_no}
                      onChange={(e) => setRow(idx, { sample_no: Number(e.target.value) })}
                      isDisabled={saving}
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.500" mb={1}>Volume (ml)</Text>
                    <Input
                      type="number"
                      value={row.volume_ml}
                      onChange={(e) => setRow(idx, { volume_ml: e.target.value })}
                      isDisabled={saving}
                    />
                  </Box>
                  <IconButton
                    aria-label="Remove"
                    icon={<MinusIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRow(idx)}
                    isDisabled={saving || measures.length <= 1}
                  />
                </HStack>
              ))}
            </VStack>
          </Box>

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
                {metricBox("Total (ml)", typeof metrics.total_ml === "number" ? metrics.total_ml.toFixed(2) : metrics.total_ml)}
                {metricBox("Average (ml)", typeof metrics.avg_ml === "number" ? metrics.avg_ml.toFixed(2) : metrics.avg_ml)}
                {metricBox("Speed @1min (ml)", typeof metrics.speed_1min_ml === "number" ? metrics.speed_1min_ml.toFixed(2) : metrics.speed_1min_ml)}
              </SimpleGrid>
            ) : (
              <Text color="gray.500">No metrics yet.</Text>
            )}
          </Box>

          {/* KPI SPEED */}
          <Box>
            <Heading size="sm" mb={2}>KPIs</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <KpiBox title="Speed" k={kpis?.SPEED} />
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
            ? `Score: ${scoreLabel(score)} — value: ${rawVal != null ? rawVal : "n/a"}`
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
