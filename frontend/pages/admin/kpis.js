// pages/admin/kpis.js
import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Box, Heading, HStack, Button, Select, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, NumberInput, NumberInputField,
  Input, IconButton, useToast, Badge, Text, Divider, Tooltip, Spacer,
} from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";
import { FiPlus, FiTrash2, FiSave, FiRefreshCcw } from "react-icons/fi";

import { getToken } from "../../lib/auth";
import { listKpis, getKpiScales, putKpiScales } from "../../lib/api";

import { BackHomeIcon } from "../../components/ui/BackHomeIcon";

// --- fallback se /kpis non fosse ancora disponibile ---
const FALLBACK_KPIS = [
  { code: "CLOSURE", name: "Closure" },
  { code: "CONGESTION_RISK", name: "Congestion Risk" },
  { code: "HYPERKERATOSIS_RISK", name: "Hyperkeratosis Risk" },
  { code: "FITTING", name: "Fitting" },
  { code: "SPEED", name: "Speed" },
  { code: "RESPRAY", name: "Respray" },
  { code: "FLUYDODYNAMIC", name: "Fluydodynamic" }, 
  { code: "SLIPPAGE", name: "Slippage" },
  { code: "RINGING_RISK", name: "Ringing Risk" },
];

// Template 4 bande base (modifica i numeri a piacere quando fai Reset)
const TEMPLATE_BANDS = [
  { band_min: 0,    band_max: 2.5,  score: 1, label: "Poor"  },
  { band_min: 2.51, band_max: 5.0,  score: 2, label: "Fair"  },
  { band_min: 5.01, band_max: 7.5,  score: 3, label: "Good"  },
  { band_min: 7.51, band_max: 10.0, score: 4, label: "Best"  },
];

// helpers
const toNum = (x) =>
  typeof x === "number" ? x : parseFloat(String(x).replace(",", "."));

const sortBands = (bands) =>
  [...bands].sort((a, b) => {
    const amin = toNum(a.band_min);
    const bmin = toNum(b.band_min);
    if (amin !== bmin) return amin - bmin;
    const amax = toNum(a.band_max);
    const bmax = toNum(b.band_max);
    return amax - bmax;
  });

function validateBands(bands) {
  if (!bands || !bands.length) return "Add at least one band.";

  // normalizza a numeri per la validazione
  const nb = bands.map(b => ({
    ...b,
    band_min: toNum(b.band_min),
    band_max: toNum(b.band_max),
    score: Number(b.score),
  }));

  for (let i = 0; i < nb.length; i++) {
    const b = nb[i];
    if (!Number.isFinite(b.band_min) || !Number.isFinite(b.band_max)) {
      return `Band #${i + 1}: min/max must be numeric.`;
    }
    if (b.band_min > b.band_max) {
      return `Band #${i + 1}: min > max.`;
    }
    if (![1, 2, 3, 4].includes(b.score)) {
      return `Band #${i + 1}: score must be 1–4.`;
    }
    if (typeof (b.label ?? "") !== "string") {
      return `Band #${i + 1}: label required.`;
    }
  }

  // overlap check (consentite adiacenze: next.min può == prev.max)
  const s = sortBands(nb);
  for (let i = 1; i < s.length; i++) {
    const prev = s[i - 1], cur = s[i];
    if (cur.band_min < prev.band_max) {
      return `Bands overlap between #${i} and #${i + 1} (check min/max).`;
    }
  }
  return null;
}

export default function AdminKpis() {
  const toast = useToast();

  const [token, setToken] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [code, setCode] = useState(""); // KPI selezionato
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // bootstrap: token + elenco KPI
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
    (async () => {
      try {
        const list = await listKpis(t).catch(() => FALLBACK_KPIS);
        setKpis(list);
        if (list?.length) setCode(list[0].code);
      } catch {
        setKpis(FALLBACK_KPIS);
        setCode(FALLBACK_KPIS[0].code);
      }
    })();
  }, []);

  // quando cambio KPI, carico le scale
  useEffect(() => {
    if (!token || !code) { setBands([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await getKpiScales(token, code).catch(() => ({ bands: [] }));
        // manteniamo i valori come arrivano (numeri), ma gli input gestiranno stringhe in edit
        setBands(sortBands(res?.bands || []));
      } catch (e) {
        setBands([]);
        toast({ title: "Cannot load KPI scales", status: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, code]);

  const onAddRow = () => {
    setBands((prev) => [...prev, { band_min: "", band_max: "", score: 1, label: "" }]);
  };

  const onDeleteRow = (idx) => {
    setBands((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBand = (idx, patch) => {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const onResetTemplate = () => {
    setBands(sortBands(TEMPLATE_BANDS));
  };

  const onSave = async () => {
    const err = validateBands(bands);
    if (err) {
      toast({ title: "Validation error", description: err, status: "warning" });
      return;
    }
    try {
      setSaving(true);
      // prepara payload numerico pulito
      const payloadBands = sortBands(bands).map(b => ({
        band_min: toNum(b.band_min),
        band_max: toNum(b.band_max),
        score: Number(b.score),
        label: b.label || "",
      }));
      await putKpiScales(token, code, { bands: payloadBands });
      toast({ title: "KPI scales saved", status: "success" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Unknown error",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const headerKpi = useMemo(() => {
    const row = kpis.find((k) => k.code === code);
    return row ? `${row.test_type_code || ""} ${row.test_type_code ? "Test" : ""}`.trim() : (code || "Select KPI");
  }, [kpis, code]);

  return (
    <Box maxW="6xl" mx="auto" p={{ base: 4, md: 8 }}>
      <HStack gap={3} mb={4}>
        <BackHomeIcon />
        <Heading size="lg">KPI Definition</Heading>
      </HStack>

      <Card>
        <CardHeader pb={2}>
          <HStack>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>KPI</Text>
              <Select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxW="sm"
              >
                {kpis.map((k) => (
                  <option key={k.code} value={k.code}>
                    {k.name || k.code}
                  </option>
                ))}
              </Select>
            </Box>
            {!!headerKpi && <Badge colorScheme="blue" ml={2} borderRadius={4}>{headerKpi}</Badge>}
            <Spacer />
            <Tooltip label="Reset 4 bands template">
              <IconButton
                aria-label="Reset template"
                icon={<FiRefreshCcw />}
                onClick={onResetTemplate}
                variant="outline"
                size="sm"
              />
            </Tooltip>
            <Tooltip label="Add band">
              <IconButton
                aria-label="Add band"
                icon={<FiPlus />}
                onClick={onAddRow}
                variant="outline"
                size="sm"
              />
            </Tooltip>
            <Tooltip label="Save scales">
              <Button
                leftIcon={<FiSave />}
                colorScheme="blue"
                onClick={onSave}
                isLoading={saving}
                size="sm"
              >
                Save
              </Button>
            </Tooltip>
          </HStack>
        </CardHeader>
        <CardBody pt={2}>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th minW="140px">Min</Th>
                <Th minW="140px">Max</Th>
                <Th minW="120px">Score</Th>
                <Th>Label</Th>
                <Th w="1%"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={5}>Loading…</Td></Tr>
              ) : bands.length ? (
                bands.map((b, idx) => (
                  <Tr key={idx}>
                    <Td>
                      <NumberInput
                        value={b.band_min}
                        onChange={(valueStr /*, valueNum*/ ) => updateBand(idx, { band_min: valueStr })}
                        precision={2}
                        step={0.1}
                        min={-1e9}
                        clampValueOnBlur={false}
                        keepWithinRange={false}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </Td>
                    <Td>
                      <NumberInput
                        value={b.band_max}
                        onChange={(valueStr /*, valueNum*/ ) => updateBand(idx, { band_max: valueStr })}
                        precision={2}
                        step={0.1}
                        min={-1e9}
                        clampValueOnBlur={false}
                        keepWithinRange={false}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </Td>
                    <Td>
                      <Select
                        value={b.score}
                        onChange={(e) => updateBand(idx, { score: Number(e.target.value) })}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </Select>
                    </Td>
                    <Td>
                      <Input
                        value={b.label ?? ""}
                        onChange={(e) => updateBand(idx, { label: e.target.value })}
                        placeholder="Label"
                      />
                    </Td>
                    <Td>
                      <Tooltip label="Delete row">
                        <IconButton
                          aria-label="Delete row"
                          icon={<FiTrash2 />}
                          onClick={() => onDeleteRow(idx)}
                          variant="ghost"
                          colorScheme="red"
                          size="sm"
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr><Td colSpan={5} color="gray.500">No bands. Click “Add band” or “Reset template”.</Td></Tr>
              )}
            </Tbody>
          </Table>

          <Divider my={4} />

          <Box color="gray.600" fontSize="sm">
            <strong>Rules:</strong> score ∈ {`{1,2,3,4}`}; bands must be ordered (min ≤ max), no overlaps
            (adjacent allowed: next.min can equal prev.max). Negative values are allowed.
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
