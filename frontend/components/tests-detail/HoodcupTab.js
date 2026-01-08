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
  getProduct,
  listProductApplications,
  getLatestSmtHoodRun,
} from "../../lib/api";
import { formatTeatSize } from "../../lib/teatSizes";

const FLOW_LIST = ["0.5", "1.9", "3.6"];
const BLUE_SHADES = { "0.5": "#90cdf4", "1.9": "#4299e1", "3.6": "#2b6cb0" };
const RED_SHADES = { "0.5": "#feb2b2", "1.9": "#f56565", "3.6": "#c53030" };
const RED_LINE = "#e53e3e";
const COLOR_PALETTE = ["#2b6cb0", "#4a5568", "#3182ce", "#1a365d", "#63b3ed", "#5a67d8", "#2c5282"];
const kpaToInhg = (v) => (v == null ? null : Number((v * 0.295299830714).toFixed(2)));

export default function HoodcupTab({ selected = [], selectedKeys = [] }) {
  const [unitSystem, setUnitSystem] = useState("metric");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flowBars, setFlowBars] = useState({ "0.5": [], "1.9": [], "3.6": [] });
  const [highlight, setHighlight] = useState({ "0.5": "", "1.9": "", "3.6": "" });
  const barHeight = useBreakpointValue({ base: 180, md: 220 });
  const isWide = useBreakpointValue({ base: false, lg: true });
  const isImperial = unitSystem === "imperial";
  const unitLabel = isImperial ? "inHg" : "kPa";
  const flowUnit = isImperial ? "gpm" : "L/min";
  const flowLabel = (flow) => {
    if (!isImperial) return flow;
    const val = Number(flow);
    if (!Number.isFinite(val)) return flow;
    return (val * 0.264172).toFixed(2);
  };
  const displayValue = (kpa) => (isImperial ? kpaToInhg(kpa) : kpa);
  const threshold = isImperial ? kpaToInhg(45) : 45;
  const maxCount = Math.max(flowBars["0.5"].length, flowBars["1.9"].length, flowBars["3.6"].length);
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
        setFlowBars({ "0.5": [], "1.9": [], "3.6": [] });
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
        const flows = { "0.5": [], "1.9": [], "3.6": [] };

        for (const it of items) {
          try {
            const res = await getLatestSmtHoodRun(token, it.appId);
            const points = (res?.points?.length ? res.points : res?.run?.points) || [];
            const by = new Map(points.map((p) => [Number(p.flow_lpm).toFixed(1), p]));
            FLOW_LIST.forEach((fl) => {
              const p = by.get(fl);
              const minKpa = p?.hood_min != null ? Number(p.hood_min) : null;
              const maxKpa = p?.hood_max != null ? Number(p.hood_max) : null;
              flows[fl].push({ ...it, minKpa, maxKpa });
            });
          } catch {
            FLOW_LIST.forEach((fl) => flows[fl].push({ ...it, minKpa: null, maxKpa: null }));
          }
        }

        if (alive) {
          const sorted = {
            "0.5": [...flows["0.5"]].sort(sorter),
            "1.9": [...flows["1.9"]].sort(sorter),
            "3.6": [...flows["3.6"]].sort(sorter),
          };
          setFlowBars(sorted);
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

  const colorMap = useMemo(
    () => buildColorMap([...flowBars["0.5"], ...flowBars["1.9"], ...flowBars["3.6"]]),
    [flowBars]
  );
  const legendItems = useMemo(
    () => buildLegendItems([...flowBars["0.5"], ...flowBars["1.9"], ...flowBars["3.6"]], colorMap),
    [flowBars, colorMap]
  );

  const onRangeClick = (flow, label, minKpa, maxKpa) => {
    if (minKpa == null || maxKpa == null || !Number.isFinite(minKpa) || !Number.isFinite(maxKpa)) {
      setHighlight((prev) => ({ ...prev, [flow]: `${label}: No data` }));
      return;
    }
    const minVal = displayValue(minKpa);
    const maxVal = displayValue(maxKpa);
    const formatted = `${Number(minVal).toFixed(2)}-${Number(maxVal).toFixed(2)}`;
    setHighlight((prev) => ({ ...prev, [flow]: `${label}: ${formatted} ${unitLabel}` }));
  };

  return (
    <VStack align="stretch" spacing={4} w="100%">
      <Box>
        <Text fontWeight="semibold" fontSize="lg">Hoodcup Fluctuation</Text>
        <Text fontSize="sm" color="gray.600">Min/max vacuum ranges per flow; red segment shows values above 45 kPa.</Text>
      </Box>

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
        {FLOW_LIST.map((flow) => (
          <Box key={flow} flex="1" minW={0}>
            <Text fontWeight="semibold" color="gray.800">{`Flow: ${flowLabel(flow)} ${flowUnit} (${unitLabel})`}</Text>
            {loading ? (
              <HStack spacing={3} color="gray.600" mt={2}>
                <Spinner size="sm" />
                <Text>Loading Hoodcup data...</Text>
              </HStack>
            ) : error ? (
              <Text color="red.500" fontSize="sm" mt={2}>{error}</Text>
            ) : flowBars[flow].length === 0 ? (
              <Text color="gray.600" fontSize="sm" mt={2}>No selections available.</Text>
            ) : (
              <Box p={{ base: 2, md: 3 }} bg="white" mt={2}>
                <RangeBarChart
                  bars={flowBars[flow]}
                  barHeight={barHeight || 200}
                  unitLabel={unitLabel}
                  threshold={threshold}
                  displayValue={displayValue}
                  color={BLUE_SHADES[flow]}
                  alertColor={RED_SHADES[flow]}
                  colorMap={colorMap}
                  onSelect={(label, minKpa, maxKpa) => onRangeClick(flow, label, minKpa, maxKpa)}
                />
              </Box>
            )}
            {highlight[flow] ? (
              <Box mt={1} px={3} py={2} bg="gray.50" borderWidth="1px" borderRadius="md" w="fit-content">
                <Text fontSize="sm" color="gray.700">{highlight[flow]}</Text>
              </Box>
            ) : null}
          </Box>
        ))}
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

function RangeBarChart({ bars, barHeight, unitLabel, threshold, displayValue, color, alertColor, colorMap, onSelect }) {
  const height = Math.max(barHeight || 200, 160);
  const margin = { top: 8, right: 16, bottom: 48, left: 36 };
  const barW = 26;
  const gap = 34;
  const contentWidth = bars.length * (barW + gap);
  const svgWidth = margin.left + margin.right + contentWidth;

  const values = bars.flatMap((b) => [displayValue(b.minKpa), displayValue(b.maxKpa)]).filter((v) => Number.isFinite(v));
  let yMin = Math.min(...(values.length ? values : [threshold]));
  let yMax = Math.max(...(values.length ? values : [threshold]));
  yMin = Math.min(yMin, threshold);
  yMax = Math.max(yMax, threshold);
  const pad = Math.max(0.5, (yMax - yMin) * 0.05);
  const y0 = yMin - pad;
  const y1 = yMax + pad;

  const scaleY = (v) => {
    const innerH = height - margin.top;
    const ratio = (v - y0) / (y1 - y0);
    return margin.top + innerH * (1 - ratio);
  };

  const tickRange = y1 - y0;
  const tickDecimals = tickRange >= 10 ? 0 : tickRange >= 2 ? 1 : 2;
  const ticks = (() => {
    const rough = tickRange / 5;
    const candidates = [0.5, 1, 2, 5, 10];
    const step = candidates.find((s) => s >= rough) || Math.ceil(rough);
    const start = Math.ceil(y0 / step) * step;
    const end = Math.floor(y1 / step) * step;
    const arr = [];
    for (let v = start; v <= end + 1e-6; v += step) arr.push(Number(v.toFixed(2)));
    return arr;
  })();

  const friendlyLabel = (b) => {
    const parts = [];
    if (b.teat) parts.push(b.teat);
    if (b.model) parts.push(b.model);
    return parts.length ? parts.join(" - ") : b.label;
  };

  return (
    <Box overflowX="auto">
      <Box as="svg" width={svgWidth} height={height + margin.bottom} minWidth={`${Math.max(svgWidth, 320)}px`}>
        {ticks.map((t) => {
          const y = scaleY(t);
          return (
            <g key={t}>
              <line x1={margin.left} x2={svgWidth} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={t === 0 ? 1.2 : 1} />
              <text x={margin.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#718096">
                {t.toFixed(tickDecimals)}
              </text>
            </g>
          );
        })}

        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height} stroke="#cbd5e0" strokeWidth="1.1" />
        <line x1={margin.left} x2={svgWidth} y1={height} y2={height} stroke="#e2e8f0" strokeWidth="1" />

        <line
          x1={margin.left}
          x2={svgWidth}
          y1={scaleY(threshold)}
          y2={scaleY(threshold)}
          stroke={RED_LINE}
          strokeWidth="2"
          strokeDasharray="4,3"
        />

        {bars.map((b, idx) => {
          const minVal = displayValue(b.minKpa);
          const maxVal = displayValue(b.maxKpa);
          if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return null;
          const x = margin.left + idx * (barW + gap);
          const blueStart = minVal;
          const blueEnd = Math.min(threshold, maxVal);
          const hasBlue = blueStart < blueEnd;
          const redStart = Math.max(threshold, minVal);
          const redEnd = maxVal;
          const hasRed = redEnd > threshold && redStart < redEnd;
          const label = friendlyLabel(b);
          return (
            <g key={`${b.label}-${idx}`} cursor="pointer" onClick={() => onSelect?.(label, b.minKpa, b.maxKpa)}>
              {hasBlue && (
                <rect
                  x={x}
                  y={scaleY(blueEnd)}
                  width={barW}
                  height={Math.max(0, scaleY(blueStart) - scaleY(blueEnd))}
                  fill={colorMap?.get(b.productId ?? b.label) || color}
                  rx={4}
                />
              )}
              {hasRed && (
                <rect
                  x={x}
                  y={scaleY(redEnd)}
                  width={barW}
                  height={Math.max(0, scaleY(redStart) - scaleY(redEnd))}
                  fill={alertColor}
                  rx={4}
                />
              )}
            </g>
          );
        })}

        {bars.map((b, idx) => {
          const xCenter = margin.left + idx * (barW + gap) + barW / 2;
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
        Values shown in {unitLabel}. Click a bar to see the range.
      </Text>
    </Box>
  );
}
