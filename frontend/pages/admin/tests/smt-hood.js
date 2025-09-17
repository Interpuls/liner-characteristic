import { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, Card, CardHeader, CardBody, Text, Heading,
  HStack, VStack, Input, Button, Divider, Spinner, Tag, TagLabel,
  Stat, StatNumber, Tooltip, Select, useToast, InputGroup, InputLeftAddon
} from "@chakra-ui/react";
import { getToken } from "@/lib/auth";
import {
  listProducts, listProductApplications, getKpiValuesByPA,
  createSmtHoodRun, computeSmtHoodRun, getLatestSmtHoodRun, upsertSmtHoodPoints
} from "@/lib/api";
import { FaCalculator } from "react-icons/fa";
import { AppSizePill } from "../../../components/ui/AppSizePill";

const FLOWS = [0.5, 1.9, 3.6];
const COLOR = "orange";

// score helpers uniformi
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

const fmt2 = (v) => (v == null ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function SmtHoodTestPage() {
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
      } catch {
        setProducts([]);
        toast({ title: "Errore caricamento prodotti", status: "error" });
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
      {/* Nessun title, come Massage aggiornato */}

      {/* Selettore prodotto, allineato agli altri tab */}
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

      {loading && <HStack><Spinner /><Text>Loading products…</Text></HStack>}
      {fetchingApps && <HStack><Spinner /><Text>Loading applications…</Text></HStack>}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {applications.map((pa) => (
          <SmtHoodCard key={pa.id} token={token} application={pa} />
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

function SmtHoodCard({ token, application }) {
  const toast = useToast();

  // inputs per flow
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(FLOWS.map(f => [f, { smt_min: "", smt_max: "", hood_min: "", hood_max: "" }]))
  );
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [runId, setRunId] = useState(null);

  // derived per-flow + score (da risposta compute)
  const [perFlow, setPerFlow] = useState(null);
  // kpi finali (media) letti da API dopo compute
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    if (!token || !application?.id) return;
    (async () => {
      setBusy(true);
      try {
        // KPI finali correnti per questa application
        const values = await getKpiValuesByPA(token, application.id);
        const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
        setKpis(map);

        // Ultimo run per prefill inputs
        const latest = await getLatestSmtHoodRun(token, application.id);
        if (latest?.run?.id) {
          setRunId(latest.run.id);
          const next = { 0.5: {smt_min:"",smt_max:"",hood_min:"",hood_max:""},
                         1.9: {smt_min:"",smt_max:"",hood_min:"",hood_max:""},
                         3.6: {smt_min:"",smt_max:"",hood_min:"",hood_max:""} };
          for (const p of latest.points || []) {
            const f = Number(p.flow_lpm);
            if (FLOWS.includes(f)) {
              next[f] = {
                smt_min: String(p.smt_min),
                smt_max: String(p.smt_max),
                hood_min: String(p.hood_min),
                hood_max: String(p.hood_max),
              };
            }
          }
          setInputs(next);
        } else {
          setRunId(null);
        }
      } catch (e) {
        // noop
      } finally {
        setBusy(false);
      }
    })();
  }, [token, application?.id]);

  const canCompute = useMemo(() => {
    return FLOWS.every(f => {
      const v = inputs[f];
      return v && v.smt_min !== "" && v.smt_max !== "" && v.hood_min !== "" && v.hood_max !== "";
    });
  }, [inputs]);

  const onChange = (flow, field, val) => {
    setInputs(prev => ({ ...prev, [flow]: { ...prev[flow], [field]: val } }));
  };

  const onSaveAndCompute = async () => {
    if (!token || !canCompute) {
      toast({ title: "Compila tutti i campi", status: "warning" });
      return;
    }
    setSaving(true);
    try {
      const points = FLOWS.map(f => ({
        flow_lpm: f,
        smt_min: Number(inputs[f].smt_min),
        smt_max: Number(inputs[f].smt_max),
        hood_min: Number(inputs[f].hood_min),
        hood_max: Number(inputs[f].hood_max),
      }));

      let currentRunId = runId;

      if (currentRunId) {
        await upsertSmtHoodPoints(token, currentRunId, points);
      } else {
        const run = await createSmtHoodRun(token, {
          product_application_id: application.id,
          points,
          notes: "from UI",
        });
        currentRunId = run.id;
        setRunId(run.id);
      }

      // compute
      const res = await computeSmtHoodRun(token, currentRunId);
      setPerFlow(res?.flows || null);

      // refresh KPI finali (media)
      const values = await getKpiValuesByPA(token, application.id);
      const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
      setKpis(map);

      toast({ title: "Salvato e calcolato", status: "success" });
    } catch (e) {
      toast({ title: "Errore salvataggio/calcolo", status: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outline">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <AppSizePill color={COLOR}>{application.size_mm} mm</AppSizePill>
          {busy && <Spinner size="sm" />}
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {/* Inputs per i tre flow */}
          {FLOWS.map((f) => (
            <Box key={f} p={3} borderWidth="1px" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">{f} L/min</Text>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>SMT min</Text>
                  <Input
                    type="number"
                    value={inputs[f].smt_min}
                    onChange={(e) => onChange(f, "smt_min", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>SMT max</Text>
                  <Input
                    type="number"
                    value={inputs[f].smt_max}
                    onChange={(e) => onChange(f, "smt_max", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>HOOD min</Text>
                  <Input
                    type="number"
                    value={inputs[f].hood_min}
                    onChange={(e) => onChange(f, "hood_min", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>HOOD max</Text>
                  <Input
                    type="number"
                    value={inputs[f].hood_max}
                    onChange={(e) => onChange(f, "hood_max", e.target.value)}
                    isDisabled={saving}
                  />
                </Box>
              </SimpleGrid>

              {/* Derived per-flow (valore + score) */}
              {perFlow?.[f] ? (
                <Box mt={3}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                    <DerivedBox
                      label="Respray"
                      value={perFlow[f].respray?.value}
                      score={perFlow[f].respray?.score}
                      tooltip="SMTmax − 45 (kPa)"
                    />
                    <DerivedBox
                      label="Fluydodynamic"
                      value={perFlow[f].fluydodynamic?.value}
                      score={perFlow[f].fluydodynamic?.score}
                      tooltip="(SMTmax − SMTmin) − max(SMTmax − 45, 0)"
                    />
                    <DerivedBox
                      label="Slippage"
                      value={perFlow[f].slippage?.value}
                      score={perFlow[f].slippage?.score}
                      tooltip="(HOODmax − HOODmin) − max(HOODmax − 45, 0)"
                    />
                    <DerivedBox
                      label="Ringing risk"
                      value={perFlow[f].ringing_risk?.value}
                      score={perFlow[f].ringing_risk?.score}
                      tooltip="HOODmax − 45 (kPa)"
                    />
                  </SimpleGrid>
                </Box>
              ) : null}
            </Box>
          ))}

          <HStack justify="flex-end">
            <Button
              leftIcon={<FaCalculator />}
              colorScheme={COLOR}
              onClick={onSaveAndCompute}
              isDisabled={!canCompute || saving}
              isLoading={saving}
            >
              Save & Compute
            </Button>
          </HStack>

          <Divider />

          {/* KPI finali (media dei 3 flow), letti da getKpiValuesByPA */}
          <Box>
            <Heading size="sm" mb={2}>KPIs</Heading>
            <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
              <KpiBox title="Respray" k={kpis?.RESPRAY} />
              <KpiBox title="Fluydodynamic" k={kpis?.FLUYDODINAMIC} />
              <KpiBox title="Slippage" k={kpis?.SLIPPAGE} />
              <KpiBox title="Ringing risk" k={kpis?.RINGING_RISK} />
            </SimpleGrid>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}

function DerivedBox({ label, value, score, tooltip }) {
  return (
    <Box>
      <HStack justify="space-between" align="center" mb={1}>
        <Tag size="sm" variant="subtle" colorScheme={COLOR} borderRadius="md">
          <TagLabel>{label}</TagLabel>
        </Tag>
        <Tooltip label={tooltip} hasArrow>
          <Text fontSize="xs" color="gray.500">formula</Text>
        </Tooltip>
      </HStack>
      <HStack>
        <Text>{fmt2(value)} kPa</Text>
        <Tooltip
          label={score != null ? `Score: ${scoreLabel(score)} (${score}/4)` : "Not computed yet"}
          hasArrow
        >
          <Stat p={1} borderWidth="1px" borderRadius="md" bg={scoreColor(score)} minW="40px" textAlign="center">
            <StatNumber fontSize="md" color="white">
              {score != null ? score : "—"}
            </StatNumber>
          </Stat>
        </Tooltip>
      </HStack>
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
            ? `Score: ${scoreLabel(score)} (${score}/4) — value: ${rawVal != null ? fmt2(rawVal) + " kPa" : "n/a"}`
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
