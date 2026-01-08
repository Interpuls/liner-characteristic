import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Stack,
  StackDivider,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { getToken } from "../../lib/auth";
import {
  getMe,
  getKpiValuesByPA,
  getProduct,
  listProductApplications,
  getLatestMassageRun,
} from "../../lib/api";
import { latestKpiByCode } from "../../lib/kpi";
import { formatTeatSize } from "../../lib/teatSizes";

const BAR_COLOR = "#2b6cb0";
const OM_COLOR = "#90cdf4";
const PF_COLOR = "#2b6cb0";
const COLOR_PALETTE = ["#2b6cb0", "#4a5568", "#3182ce", "#1a365d", "#63b3ed", "#5a67d8", "#2c5282"];
const kpaToInhg = (v) => (v == null ? null : Number((v * 0.295299830714).toFixed(2)));

export default function MassageTab({ selected = [], selectedKeys = [] }) {
  const [unitSystem, setUnitSystem] = useState("metric");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bars, setBars] = useState([]); // Real TPP
  const [omBars, setOmBars] = useState([]); // Massage intensity OM
  const [pfBars, setPfBars] = useState([]); // Massage intensity PF
  const [highlight, setHighlight] = useState("");
  const [intensityHighlightOm, setIntensityHighlightOm] = useState("");
  const [intensityHighlightPf, setIntensityHighlightPf] = useState("");
  const barHeight = useBreakpointValue({ base: 180, md: 220 });
  const isWide = useBreakpointValue({ base: false, lg: true });
  const unitLabel = unitSystem === "imperial" ? "inHg" : "kPa";
  const displayValue = (kpa) => (unitSystem === "imperial" ? kpaToInhg(kpa) : kpa);
  const maxCount = Math.max(bars.length, omBars.length, pfBars.length);
  const compactLayout = !!isWide && maxCount > 0 && maxCount <= 3;
  const chartDirection = compactLayout ? "row" : "column";

  const selectedIds = useMemo(
    () => selected.filter((s) => /^\d+$/.test(String(s))).map((s) => Number(s)),
    [selected]
  );
  const keyList = useMemo(
    () => (selectedKeys || []).filter((s) => String(s).includes("-")),
    [selectedKeys]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selected?.length && !keyList.length) {
        setBars([]);
        setOmBars([]);
        setPfBars([]);
        return;
      }
      const token = getToken();
      if (!token) {
        window.location.replace("/login");
        return;
      }
      setLoading(true);
      setError("");
      try {
        try {
          const me = await getMe(token);
          if (alive && me?.unit_system) setUnitSystem(me.unit_system);
          if (alive) setIsAdmin(me?.role === "admin");
        } catch {}

        const items = await resolveSelection({ token, selectedIds, selectedKeys: keyList });
        const sorter = makeTeatSorter();
        const tppArr = [];
        const omArr = [];
        const pfArr = [];

        for (const it of items) {
          try {
            const values = await getKpiValuesByPA(token, it.appId);
            const latest = latestKpiByCode(values);
            const closure = latest?.["CLOSURE"];
            const val = closure?.value_num != null ? Number(closure.value_num) : null;
            tppArr.push({ ...it, valueKpa: val });
          } catch {
            tppArr.push({ ...it, valueKpa: null });
          }

          try {
            const massage = await getLatestMassageRun(token, it.appId);
            const { omKpa, pfKpa } = extractMassageIntensity(massage);
            omArr.push({ ...it, valueKpa: omKpa });
            pfArr.push({ ...it, valueKpa: pfKpa });
          } catch {
            omArr.push({ ...it, valueKpa: null });
            pfArr.push({ ...it, valueKpa: null });
          }
        }

        if (alive) {
          setBars([...tppArr].sort(sorter));
          setOmBars([...omArr].sort(sorter));
          setPfBars([...pfArr].sort(sorter));
        }
      } catch (e) {
        if (alive) setError(e?.message || "Unable to load data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedIds.join(","), keyList.join(",")]);

  const maxTpp = useMemo(() => computeMax(bars, displayValue), [bars, unitSystem]);
  const maxOm = useMemo(() => computeMax(omBars, displayValue), [omBars, unitSystem]);
  const maxPf = useMemo(() => computeMax(pfBars, displayValue), [pfBars, unitSystem]);
  const colorMap = useMemo(() => buildColorMap([...bars, ...omBars, ...pfBars]), [bars, omBars, pfBars]);
  const legendItems = useMemo(() => buildLegendItems([...bars, ...omBars, ...pfBars], colorMap), [bars, omBars, pfBars, colorMap]);

  const onBarClick = (label, kpaVal) => {
    if (kpaVal == null || !Number.isFinite(kpaVal)) {
      setHighlight(`${label}: No data`);
      return;
    }
    const val = displayValue(kpaVal);
    const formatted = Number.isFinite(val) ? val.toFixed(2) : val;
    setHighlight(`${label}: ${formatted} ${unitLabel}`);
  };

  const onIntensityClick = (label, kpaVal, kindLabel) => {
    if (kpaVal == null || !Number.isFinite(kpaVal)) {
      if (kindLabel === "OM") setIntensityHighlightOm(`${label}: No data`);
      else setIntensityHighlightPf(`${label}: No data`);
      return;
    }
    const val = displayValue(kpaVal);
    const formatted = Number.isFinite(val) ? val.toFixed(2) : val;
    if (kindLabel === "OM") setIntensityHighlightOm(`${label}: ${formatted} ${unitLabel}`);
    else setIntensityHighlightPf(`${label}: ${formatted} ${unitLabel}`);
  };

  return (
    <VStack align="stretch" spacing={4} w="100%">
      {legendItems.length > 0 && (
        <Box bg="#f8fafc73" borderWidth="1px" borderRadius="md" p={2}>
          <Text fontSize="xs" color="gray.600" mb={1}>Product colors</Text>
          <HStack spacing={2} wrap="wrap">
            {legendItems.map((item) => (
              <HStack
                key={item.key}
                spacing={2}
                px={2}
                py={1}
                minW={isAdmin ? "140px" : "auto"}
                borderWidth="1px"
                borderRadius="full"
                borderColor="gray.200"
                bg="white"
              >
                <Box w="10px" h="10px" borderRadius="full" bg={item.color} />
                <VStack spacing={0} align="start">
                  <Text fontSize="sm" color="gray.700">{item.label}</Text>
                  {isAdmin && item.compound ? (
                    <Text fontSize="xs" color="gray.500">{item.compound}</Text>
                  ) : null}
                </VStack>
              </HStack>
            ))}
          </HStack>
        </Box>
      )}

      <Stack direction={chartDirection} divider={<StackDivider borderColor="gray.200" />} spacing={4} align="stretch">
        <Box flex="1" minW={0}>
          <Text fontWeight="semibold">{`Real TPP (${unitLabel})`}</Text>
          <Text fontSize="sm" color="gray.500" mb={1}>Latest closure vacuum per application.</Text>
          {loading ? (
            <HStack spacing={3} color="gray.600">
              <Spinner size="sm" />
              <Text>Loading Real TPP...</Text>
            </HStack>
          ) : error ? (
            <Text color="red.500" fontSize="sm">{error}</Text>
          ) : bars.length === 0 ? (
            <Text color="gray.600" fontSize="sm">No selections available.</Text>
          ) : (
            <Box p={{ base: 2, md: 3 }} bg="white">
              <BarChart
                bars={bars}
                maxVal={maxTpp}
                barHeight={barHeight || 200}
                unitLabel={unitLabel}
                displayValue={displayValue}
                color={BAR_COLOR}
                colorMap={colorMap}
                onSelect={onBarClick}
              />
            </Box>
          )}
          {highlight ? (
            <Box mt={1} px={3} py={2} bg="gray.50" borderWidth="1px" borderRadius="md" w="fit-content">
              <Text fontSize="sm" color="gray.700">{highlight}</Text>
            </Box>
          ) : null}
        </Box>

        <Box flex="1" minW={0}>
          <Text fontWeight="semibold">{`Massage Intensity - Overmilk (${unitLabel})`}</Text>
          <Text fontSize="sm" color="gray.500" mb={1}>Derived from min/max points at 45/40/35 kPa.</Text>
          {loading ? (
            <HStack spacing={3} color="gray.600">
              <Spinner size="sm" />
              <Text>Loading Massage Intensity...</Text>
            </HStack>
          ) : error ? (
            <Text color="red.500" fontSize="sm">{error}</Text>
          ) : omBars.length === 0 ? (
            <Text color="gray.600" fontSize="sm">No selections available.</Text>
          ) : (
            <Box p={{ base: 2, md: 3 }} bg="white">
              <BarChart
                bars={omBars}
                maxVal={maxOm}
                barHeight={barHeight || 200}
                unitLabel={unitLabel}
                displayValue={displayValue}
                color={OM_COLOR}
                colorMap={colorMap}
                onSelect={(label, val) => onIntensityClick(label, val, "OM")}
              />
            </Box>
          )}
          {intensityHighlightOm ? (
            <Box mt={1} px={3} py={2} bg="gray.50" borderWidth="1px" borderRadius="md" w="fit-content">
              <Text fontSize="sm" color="gray.700">{intensityHighlightOm}</Text>
            </Box>
          ) : null}
        </Box>

        <Box flex="1" minW={0}>
          <Text fontWeight="semibold">{`Massage Intensity - PF (${unitLabel})`}</Text>
          <Text fontSize="sm" color="gray.500" mb={1}>Derived from min/max points at 45/40/35 kPa.</Text>
          {loading ? (
            <HStack spacing={3} color="gray.600">
              <Spinner size="sm" />
              <Text>Loading Massage Intensity...</Text>
            </HStack>
          ) : error ? (
            <Text color="red.500" fontSize="sm">{error}</Text>
          ) : pfBars.length === 0 ? (
            <Text color="gray.600" fontSize="sm">No selections available.</Text>
          ) : (
            <Box p={{ base: 2, md: 3 }} bg="white">
              <BarChart
                bars={pfBars}
                maxVal={maxPf}
                barHeight={barHeight || 200}
                unitLabel={unitLabel}
                displayValue={displayValue}
                color={PF_COLOR}
                colorMap={colorMap}
                onSelect={(label, val) => onIntensityClick(label, val, "PF")}
              />
            </Box>
          )}
          {intensityHighlightPf ? (
            <Box mt={1} px={3} py={2} bg="gray.50" borderWidth="1px" borderRadius="md" w="fit-content">
              <Text fontSize="sm" color="gray.700">{intensityHighlightPf}</Text>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </VStack>
  );
}

async function resolveSelection({ token, selectedIds = [], selectedKeys = [] }) {
  if (selectedKeys.length > 0) {
    const byPid = new Map();
    const uniqPids = [...new Set(selectedKeys.map((k) => Number(String(k).split("-")[0])))]
      .filter((n) => Number.isFinite(n));
    await Promise.all(
      uniqPids.map(async (pid) => {
        try {
          const [prod, apps] = await Promise.all([
            getProduct(token, pid),
            listProductApplications(token, pid),
          ]);
          byPid.set(pid, { prod, apps });
        } catch {}
      })
    );
    return selectedKeys
      .map((k) => {
        const [pidStr, sizeStr] = String(k).split("-");
        const pid = Number(pidStr);
        const size = Number(sizeStr);
        const entry = byPid.get(pid) || {};
        const apps = Array.isArray(entry.apps) ? entry.apps : [];
        const match = apps.find((a) => Number(a.size_mm) === size);
        const labelParts = [];
        if (entry.prod?.model) labelParts.push(entry.prod.model);
        if (sizeStr) labelParts.push(formatTeatSize(sizeStr));
        const label = labelParts.join(" - ") || `App ${match?.id ?? ""}`;
        const teatLabel = formatTeatSize(sizeStr || "");
        const model = entry.prod?.model || "";
        const compound = entry.prod?.compound || "";
        return match?.id ? { appId: Number(match.id), label, model, teat: teatLabel, productId: pid, compound } : null;
      })
      .filter(Boolean);
  }
  return selectedIds.map((id) => ({ appId: Number(id), label: `App ${id}`, model: "", teat: "", productId: null }));
}

function computeMax(arr, displayValue) {
  const vals = arr.map((b) => Number(displayValue(b.valueKpa))).filter((v) => Number.isFinite(v));
  return vals.length ? Math.max(...vals, 0) : 0;
}

function extractMassageIntensity(res) {
  const points = (res?.points?.length ? res.points : res?.run?.points) || [];
  const by = new Map(points.map((p) => [Number(p.pressure_kpa), p]));
  let om = null;
  let pf = null;

  const p45 = by.get(45);
  const p40 = by.get(40);
  const p35 = by.get(35);
  if (p45 && p40 && p35) {
    const I45 = Number(p45.max_val) - Number(p45.min_val);
    const I40 = Number(p40.max_val) - Number(p40.min_val);
    const I35 = Number(p35.max_val) - Number(p35.min_val);
    om = (I45 + I40) / 2.0;
    pf = (I40 + I35) / 2.0;
  } else {
    const m = res?.metrics || res?.run?.metrics || null;
    om = m?.avg_overmilk != null ? Number(m.avg_overmilk) : null;
    pf = m?.avg_pf != null ? Number(m.avg_pf) : null;
  }
  return { omKpa: om, pfKpa: pf };
}

function makeTeatSorter() {
  const order = { XS: 1, S: 2, M: 3, L: 4 };
  return (a, b) => {
    const ta = order[(a.teat || "").toUpperCase()] || 99;
    const tb = order[(b.teat || "").toUpperCase()] || 99;
    if (ta !== tb) return ta - tb;
    return (a.label || "").localeCompare(b.label || "");
  };
}

function buildColorMap(items) {
  const map = new Map();
  let idx = 0;
  for (const it of items) {
    const key = it.productId ?? it.label;
    if (key == null || map.has(key)) continue;
    map.set(key, COLOR_PALETTE[idx % COLOR_PALETTE.length]);
    idx += 1;
  }
  return map;
}

function buildLegendItems(items, colorMap) {
  const seen = new Set();
  const res = [];
  for (const it of items) {
    const key = it.productId ?? it.label;
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    const color = colorMap?.get(key);
    if (!color) continue;
    const label = it.model || it.label || `Item ${res.length + 1}`;
    res.push({ key, label, color, compound: it.compound });
  }
  return res;
}

function BarChart({ bars, maxVal, barHeight, unitLabel, displayValue, onSelect, color = BAR_COLOR, colorMap }) {
  const safeMaxRaw = maxVal && Number.isFinite(maxVal) ? maxVal : 1;
  const safeMax = Math.max(1, Math.ceil(safeMaxRaw * 1.15 * 10) / 10);
  const height = Math.max(barHeight || 200, 140);
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (safeMax / tickCount) * i);
  const barW = 26;
  const gap = 34;
  const marginLeft = 36;
  const marginBottom = 48;
  const contentWidth = bars.length * (barW + gap);
  const svgWidth = marginLeft + contentWidth;

  const friendlyLabel = (b) => {
    const parts = [];
    if (b.teat) parts.push(b.teat);
    if (b.model) parts.push(b.model);
    return parts.length ? parts.join(" · ") : b.label;
  };

  const tickDecimals = safeMax >= 10 ? 0 : safeMax >= 2 ? 1 : 2;

  return (
    <Box overflowX="auto">
      <Box as="svg" width={svgWidth} height={height + marginBottom} minWidth={`${Math.max(svgWidth, 320)}px`}>
        {ticks.map((t, i) => {
          const y = (height * (safeMax - t)) / safeMax;
          return (
            <g key={i}>
              <line x1={marginLeft} x2={svgWidth} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={t === 0 ? 1.2 : 1} />
              <text x={marginLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#718096">
                {t.toFixed(tickDecimals)}
              </text>
            </g>
          );
        })}

        <line x1={marginLeft} x2={marginLeft} y1={0} y2={height} stroke="#cbd5e0" strokeWidth="1.1" />
        <line x1={marginLeft} x2={svgWidth} y1={height} y2={height} stroke="#e2e8f0" strokeWidth="1" />

        {bars.map((b, idx) => {
          const val = displayValue(b.valueKpa);
          const h = Number.isFinite(val) && safeMax > 0 ? (val / safeMax) * height : 0;
          const x = marginLeft + idx * (barW + gap);
          const y = height - h;
          const label = friendlyLabel(b);
          const fill = colorMap?.get(b.productId ?? b.label) || color;
          return (
            <g key={`${b.label}-${idx}`} cursor="pointer" onClick={() => onSelect?.(label, b.valueKpa)}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                fill={Number.isFinite(val) ? fill : "#CBD5E0"}
                rx={4}
              />
            </g>
          );
        })}

        {bars.map((b, idx) => {
          const xCenter = marginLeft + idx * (barW + gap) + barW / 2;
          return (
            <g key={`label-${idx}`} transform={`translate(${xCenter},${height + 14})`}>
              <text textAnchor="middle" fontSize="11" fill="#4A5568">
                {b.teat || b.label}
              </text>
              {b.model ? (
                <text textAnchor="middle" fontSize="10" fill="#A0AEC0" dy="12">
                  {b.model}
                </text>
              ) : null}
            </g>
          );
        })}
      </Box>
      <Text fontSize="10px" color="gray.500" mt={1} px={1}>
        Values shown in {unitLabel}. Click a bar to see the precise value.
      </Text>
    </Box>
  );
}
