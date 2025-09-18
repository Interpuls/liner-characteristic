import { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, Card, CardHeader, CardBody, Text,
  HStack, VStack, Input, Button, Divider, Spinner,
  Stat, StatNumber, Tooltip, Heading, Tag, TagLabel,
  InputGroup, InputLeftAddon
} from "@chakra-ui/react";
import {
  getKpiValuesByPA, getLatestMassageRun,
  createMassageRun, computeMassageRun, updateMassagePoints
} from "@/lib/api";
import { FaCalculator } from "react-icons/fa";
import { AppSizePill } from "../../../components/ui/AppSizePill";

const PRESSURES = [45, 40, 35];
const MASSAGE_COLOR = "teal";

// score helpers
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

export default function AdminMassageTest({ token, pid, product, apps }) {
  if (!pid) return <Box py={8} textAlign="center" color="gray.500">Select a product to start.</Box>;

  const list = Array.isArray(apps) ? apps : [];
  if (!list.length) return <Box py={8} textAlign="center" color="gray.500">No applications for this product.</Box>;

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      {list.map((pa) => (
        <MassageCard key={pa.id} token={token} application={pa} />
      ))}
    </SimpleGrid>
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
          <AppSizePill color={MASSAGE_COLOR} size="sm">{application.size_mm} mm</AppSizePill>
          {busy && <Spinner size="s" />}
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
                  <InputGroup>
                    <InputLeftAddon fontSize="sm">kPa</InputLeftAddon>
                    <Input
                      type="number"
                      value={inputs[k].min_val}
                      onChange={(e) => onChange(k, "min_val", e.target.value)}
                      isDisabled={saving}
                    />
                  </InputGroup>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Max</Text>
                  <InputGroup>
                    <InputLeftAddon fontSize="sm">kPa</InputLeftAddon>                  
                    <Input
                      type="number"
                      value={inputs[k].max_val}
                      onChange={(e) => onChange(k, "max_val", e.target.value)}
                      isDisabled={saving}
                    />
                  </InputGroup>
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

// “chip” + valore a sinistra
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
