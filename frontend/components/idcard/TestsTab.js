import { useEffect, useMemo, useState } from "react";
import { Box, VStack, HStack, Text, Spinner, Center, Divider } from "@chakra-ui/react";
import { getToken } from "../../lib/auth";
import { listProductApplications, getLatestMassageRun, getLatestSmtHoodRun } from "../../lib/api";
import { formatTeatSize } from "../../lib/teatSizes";

// Massage bars: use two blue shades to differentiate OM and PF
const OM_COLOR = "#90cdf4"; // blue.300
const PF_COLOR = "#2b6cb0"; // blue.700

export default function TestsTab({ product, unitSystem = "metric" }) {
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState([]);
  const [data, setData] = useState([]); // [{label, om, pf}]
  const [smtData, setSmtData] = useState([]); // [{label, flows:{'0.5':{min,max},'1.9':{min,max},'3.6':{min,max}}}]
  const [hoodData, setHoodData] = useState([]); // same structure but using hood min/max
  const [massageHighlight, setMassageHighlight] = useState(null);
  const [smtHighlight, setSmtHighlight] = useState(null);
  const [hoodHighlight, setHoodHighlight] = useState(null);
  const isImperial = unitSystem === "imperial";
  const pressureLabel = isImperial ? "inHg" : "kPa";
  const kpaToInhg = (v) => v == null ? null : Number((v * 0.295299830714).toFixed(2));
  const pressureVal = (value, imperialValue) => isImperial ? imperialValue ?? (value != null ? kpaToInhg(value) : null) : value;

  const pid = product?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pid) { setApps([]); setData([]); return; }
      const t = getToken();
      if (!t) return;
      setLoading(true);
      try {
        const list = await listProductApplications(t, pid);
        const arr = Array.isArray(list) ? list : [];
        // sort by size_mm asc
        arr.sort((a, b) => Number(a.size_mm) - Number(b.size_mm));
        if (alive) setApps(arr);
        // fetch latest massage metrics per application
        const entries = await Promise.all(arr.map(async (a) => {
          try {
            const res = await getLatestMassageRun(t, a.id);
            // compute derived metrics client-side from points if metrics are not provided
            const points = (res?.points?.length ? res.points : res?.run?.points) || [];
            const by = Object.fromEntries(points.map(p => [Number(p.pressure_kpa), p]));
            let om = null, pf = null;
            if (by[45] && by[40] && by[35]) {
              const I45 = Number(by[45].max_val) - Number(by[45].min_val);
              const I40 = Number(by[40].max_val) - Number(by[40].min_val);
              const I35 = Number(by[35].max_val) - Number(by[35].min_val);
              om = (I45 + I40) / 2.0; // AVG Overmilk
              pf = (I40 + I35) / 2.0; // AVG PF
            } else {
              const m = res?.metrics || res?.run?.metrics || null;
              om = m?.avg_overmilk != null ? Number(m.avg_overmilk) : null;
              pf = m?.avg_pf != null ? Number(m.avg_pf) : null;
            }
            return {
              label: formatTeatSize(a.size_mm),
              om: pressureVal(om, res?.om_inhg),
              pf: pressureVal(pf, res?.pf_inhg),
            };
          } catch { return { label: formatTeatSize(a.size_mm), om: null, pf: null }; }
        }));
        if (alive) setData(entries);

        // SMT/HOOD latest per application (smt_max by flow)
        const flows = [0.5, 1.9, 3.6];
        const smtEntries = await Promise.all(arr.map(async (a) => {
          try {
            const res = await getLatestSmtHoodRun(t, a.id);
            const points = (res?.points?.length ? res.points : res?.run?.points) || [];
            const by = new Map(points.map(p => [Number(p.flow_lpm).toFixed(1), p]));
            const flowsObj = Object.fromEntries(flows.map(fl => {
              const key = fl.toFixed(1);
              const p = by.get(key);
              return [key, p ? {
                min: pressureVal(Number(p.smt_min), p.smt_min_inhg != null ? Number(p.smt_min_inhg) : null),
                max: pressureVal(Number(p.smt_max), p.smt_max_inhg != null ? Number(p.smt_max_inhg) : null),
              } : null];
            }));
            return { label: formatTeatSize(a.size_mm), flows: flowsObj };
          } catch {
            return { label: formatTeatSize(a.size_mm), flows: { '0.5': null, '1.9': null, '3.6': null } };
          }
        }));
        if (alive) setSmtData(smtEntries);

        // HOOD min/max per application
        const hoodEntries = await Promise.all(arr.map(async (a) => {
          try {
            const res = await getLatestSmtHoodRun(t, a.id);
            const points = (res?.points?.length ? res.points : res?.run?.points) || [];
            const by = new Map(points.map(p => [Number(p.flow_lpm).toFixed(1), p]));
            const flowsObj = Object.fromEntries(flows.map(fl => {
              const key = fl.toFixed(1);
              const p = by.get(key);
              return [key, p ? {
                min: pressureVal(Number(p.hood_min), p.hood_min_inhg != null ? Number(p.hood_min_inhg) : null),
                max: pressureVal(Number(p.hood_max), p.hood_max_inhg != null ? Number(p.hood_max_inhg) : null),
              } : null];
            }));
            return { label: formatTeatSize(a.size_mm), flows: flowsObj };
          } catch {
            return { label: formatTeatSize(a.size_mm), flows: { '0.5': null, '1.9': null, '3.6': null } };
          }
        }));
        if (alive) setHoodData(hoodEntries);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [pid, isImperial]);

  if (!pid) return <Box py={8} textAlign="center" color="gray.600">No product selected.</Box>;
  if (loading) return (
    <Center py={8} color="gray.600">
      <Spinner size="sm" mr={2} />
      <Text>Loading test data…</Text>
    </Center>
  );
  if (!apps.length) return <Box py={8} textAlign="center" color="gray.600">No applications for this product.</Box>;

  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="semibold" textAlign={{ base: 'left', md: 'center' }}>
        {`Massage Intensity (${pressureLabel})`}
      </Text>
      <ScrollableBars data={data} pressureLabel={pressureLabel} onBarSelect={setMassageHighlight} />
      {massageHighlight && (
        <Text fontSize="xs" color="gray.500" textAlign={{ base: 'left', md: 'center' }} mt={1}>
          {massageHighlight}
        </Text>
      )}
      <Legend />
      <Divider my={{ base: 2, md: 4 }} />

      <Text mt={4} fontWeight="semibold" textAlign={{ base: 'left', md: 'center' }}>
        {`SMT - Vacuum Fluctuation (${pressureLabel})`}
      </Text>
      <ScrollableSmtBars data={smtData} pressureLabel={pressureLabel} isImperial={isImperial} onBarSelect={setSmtHighlight} />
      {smtHighlight && (
        <Text fontSize="xs" color="gray.500" textAlign={{ base: 'left', md: 'center' }} mt={1}>
          {smtHighlight}
        </Text>
      )}
      <Divider my={{ base: 2, md: 4 }} />

      <Text mt={4} fontWeight="semibold" textAlign={{ base: 'left', md: 'center' }}>
        {`HOODCUP - Vacuum Fluctuation (${pressureLabel})`}
      </Text>
      <ScrollableSmtBars data={hoodData} pressureLabel={pressureLabel} isImperial={isImperial} onBarSelect={setHoodHighlight} />
      {hoodHighlight && (
        <Text fontSize="xs" color="gray.500" textAlign={{ base: 'left', md: 'center' }} mt={1}>
          {hoodHighlight}
        </Text>
      )}
    </VStack>
  );
}

function Legend() {
  return (
    <HStack spacing={4} w="100%" justify={{ base: 'flex-start', md: 'center' }} wrap="wrap">
      <HStack spacing={2}>
        <Box w="12px" h="12px" bg={OM_COLOR} borderRadius="sm" />
        <Text fontSize="sm">OM (AVG Overmilk)</Text>
      </HStack>
      <HStack spacing={2}>
        <Box w="12px" h="12px" bg={PF_COLOR} borderRadius="sm" />
        <Text fontSize="sm">PF (AVG PF)</Text>
      </HStack>
    </HStack>
  );
}

function ScrollableSmtBars({ data, pressureLabel = "kPa", isImperial = false, onBarSelect }) {
  const margin = { top: 10, right: 16, bottom: 28, left: 32 };
  const catWidth = 90; // width per application
  const innerBars = 3; // flows
  const barWidth = 16;
  const gapBars = 8;
  const gapCats = 28;
  const threshold = isImperial ? Number((45 * 0.295299830714).toFixed(2)) : 45; // convert threshold if imperial
  const minsAll = data.flatMap(d => [
    Number(d.flows?.['0.5']?.min ?? Infinity),
    Number(d.flows?.['1.9']?.min ?? Infinity),
    Number(d.flows?.['3.6']?.min ?? Infinity)
  ]).filter(v => Number.isFinite(v));
  const maxsAll = data.flatMap(d => [
    Number(d.flows?.['0.5']?.max ?? -Infinity),
    Number(d.flows?.['1.9']?.max ?? -Infinity),
    Number(d.flows?.['3.6']?.max ?? -Infinity)
  ]).filter(v => Number.isFinite(v));
  let yMin = Math.min(...(minsAll.length ? minsAll : [threshold]));
  let yMax = Math.max(...(maxsAll.length ? maxsAll : [threshold]));
  // ensure threshold is visible inside domain
  yMin = Math.min(yMin, threshold);
  yMax = Math.max(yMax, threshold);
  // add small padding
  const pad = Math.max(0.5, (yMax - yMin) * 0.05);
  const y0 = yMin - pad;
  const y1 = yMax + pad;
  const height = 240;
  const width = margin.left + margin.right + data.length * (catWidth + gapCats) - gapCats;

  const scaleY = (v) => {
    const innerH = height - margin.top - margin.bottom;
    const ratio = (v - y0) / (y1 - y0);
    return margin.top + innerH * (1 - ratio);
  };

  const ticks = (() => {
    const range = y1 - y0;
    const rough = range / 5;
    // choose step among 0.5, 1, 2, 5
    const candidates = [0.5, 1, 2, 5, 10];
    const step = candidates.find(s => s >= rough) || Math.ceil(rough);
    const start = Math.ceil(y0 / step) * step;
    const end = Math.floor(y1 / step) * step;
    const arr = [];
    for (let v = start; v <= end + 1e-6; v += step) arr.push(Number(v.toFixed(2)));
    return arr;
  })();

  const fmt = (v) => v == null ? "n/a" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const flows = ['0.5','1.9','3.6'];
  const flowLabels = { '0.5': '0.5', '1.9': '1.9', '3.6': '3.6' };
  const BLUE_SHADES = { '0.5': '#90cdf4', '1.9': '#4299e1', '3.6': '#2b6cb0' }; // light -> dark
  const RED_SHADES  = { '0.5': '#feb2b2', '1.9': '#f56565', '3.6': '#c53030'  }; // light -> dark
  const RED_LINE = '#e53e3e'; // threshold line color

  return (
    <VStack align="stretch" spacing={1}>
      <Box w="100%" overflowX={{ base: 'auto', md: 'visible' }} style={{ WebkitOverflowScrolling: 'touch' }}>
        <Box w="100%" display={{ base: 'block', md: 'flex' }} justifyContent={{ base: 'flex-start', md: 'center' }}>
          <svg width={width} height={height}>
        {/* axes */}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#cbd5e1" strokeWidth="1" />
        {/* y ticks */}
        {ticks.map((v) => {
          const y = scaleY(v);
          return (
            <g key={v}>
              <line x1={margin.left - 4} y1={y} x2={width - margin.right} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b">{v}</text>
            </g>
          );
        })}
        {/* threshold line at 45 kPa */}
        {(() => {
          const y = scaleY(threshold);
          return <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke={RED_LINE} strokeWidth="2" strokeDasharray="4,3" />;
        })()}
        {/* bars per category */}
        {data.map((d, iCat) => {
          const groupX = margin.left + iCat * (catWidth + gapCats);
          // centers three bars inside catWidth
          const totalBarsW = innerBars * barWidth + (innerBars - 1) * gapBars;
          const startX = groupX + (catWidth - totalBarsW) / 2;
          return (
            <g key={iCat}>
              {flows.map((fl, j) => {
                const f = d.flows?.[fl];
                const x = startX + j * (barWidth + gapBars);
                if (!f || f.min == null || f.max == null) {
                  return (
                    <g key={fl}>
                      <rect x={x} y={scaleY(0)} width={barWidth} height={0} />
                    </g>
                  );
                }
                const vmin = Number(f.min);
                const vmax = Number(f.max);
                const yMin = scaleY(vmin);
                const yMax = scaleY(vmax);
                const yT = scaleY(threshold);
                // blue segment: from min to at most threshold
                const blueStartVal = vmin;
                const blueEndVal = Math.min(threshold, vmax);
                const hasBlue = blueStartVal < blueEndVal;
                const blueTopY = hasBlue ? scaleY(blueEndVal) : 0;
                const blueBotY = hasBlue ? scaleY(blueStartVal) : 0;
                const blueH = hasBlue ? Math.max(0, blueBotY - blueTopY) : 0;
                // red segment: only if max above threshold; from max(threshold, min) to max
                const redStartVal = Math.max(threshold, vmin);
                const redEndVal = vmax;
                const hasRed = redEndVal > threshold && redStartVal < redEndVal;
                const redTopY = hasRed ? scaleY(redEndVal) : 0;
                const redBotY = hasRed ? scaleY(redStartVal) : 0;
                const redH = hasRed ? Math.max(0, redBotY - redTopY) : 0;
                return (
                  <g key={fl}>
                    {/* Blue segment from min up to threshold */}
                    {hasBlue && (
                      <rect
                        x={x}
                        y={blueTopY}
                        width={barWidth}
                        height={blueH}
                        fill={BLUE_SHADES[fl]}
                        rx={2}
                        onClick={() => onBarSelect?.(`${flowLabels[fl]} L/min: ${fmt(vmin)}-${fmt(Math.min(vmax, threshold))} ${pressureLabel}`)}
                      >
                        <title>{`${fl} L/min: ${fmt(vmin)}-${fmt(vmax)} ${pressureLabel}`}</title>
                      </rect>
                    )}
                    {/* Red segment above threshold */}
                    {hasRed && (
                      <rect
                        x={x}
                        y={redTopY}
                        width={barWidth}
                        height={redH}
                        fill={RED_SHADES[fl]}
                        rx={2}
                        onClick={() => onBarSelect?.(`${flowLabels[fl]} L/min: ${fmt(Math.max(vmin, threshold))}-${fmt(vmax)} ${pressureLabel}`)}
                      >
                        <title>{`${fl} L/min: ${fmt(vmin)}-${fmt(vmax)} ${pressureLabel} (above ${threshold})`}</title>
                      </rect>
                    )}
                  </g>
                );
              })}
              {/* category label */}
              <text x={groupX + catWidth/2} y={height - margin.bottom + 16} textAnchor="middle" fontSize="10" fill="#475569">{d.label}</text>
            </g>
          );
        })}
          </svg>
        </Box>
      </Box>
      <HStack spacing={4} w="100%" justify={{ base: 'flex-start', md: 'center' }} wrap="wrap">
        {flows.map(fl => (
          <HStack key={fl} spacing={2}>
            <Box w="12px" h="12px" bg={BLUE_SHADES[fl]} borderRadius="sm" />
            <Text fontSize="sm">{flowLabels[fl]} L/min</Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  );
}

function ScrollableBars({ data, pressureLabel = "kPa", onBarSelect }) {
  const margin = { top: 10, right: 16, bottom: 28, left: 28 };
  const catWidth = 68; // width per application
  const barWidth = 20; // each bar width
  const gapBars = 8; // space between OM and PF
  const gapCats = 24; // space between categories
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.om ?? 0, d.pf ?? 0)));
  const height = 220;
  const width = margin.left + margin.right + data.length * (catWidth + gapCats) - gapCats;

  const scaleY = (v) => {
    const innerH = height - margin.top - margin.bottom;
    const ratio = (v ?? 0) / maxVal;
    return margin.top + innerH * (1 - ratio);
  };

  const fmt = (v) => v == null ? "n/a" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // integer-based ticks to avoid rounding mismatch (bars aligning slightly over labels)
  const ceiling = Math.ceil(maxVal);
  const step = Math.max(1, Math.ceil(ceiling / 4));
  const lastTick = Math.ceil(ceiling / step) * step;
  const ticks = Array.from({ length: Math.floor(lastTick / step) + 1 }, (_, i) => i * step);

  return (
    <Box w="100%" overflowX={{ base: 'auto', md: 'visible' }} style={{ WebkitOverflowScrolling: 'touch' }}>
      <Box w="100%" display={{ base: 'block', md: 'flex' }} justifyContent={{ base: 'flex-start', md: 'center' }}>
        <svg width={width} height={height}>
        {/* axes */}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#cbd5e1" strokeWidth="1" />
        {/* y ticks at integer values (nice step) */}
        {ticks.map((v) => {
          const y = scaleY(v);
          return (
            <g key={v}>
              <line x1={margin.left - 4} y1={y} x2={width - margin.right} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b">{v}</text>
            </g>
          );
        })}
        {/* bars */}
        {data.map((d, i) => {
          const groupX = margin.left + i * (catWidth + gapCats);
          const omY = scaleY(d.om);
          const pfY = scaleY(d.pf);
          const baseY = height - margin.bottom;
          const omH = Math.max(0, baseY - omY);
          const pfH = Math.max(0, baseY - pfY);
          const omX = groupX + (catWidth - (2*barWidth + gapBars)) / 2;
          const pfX = omX + barWidth + gapBars;
          return (
            <g key={i}>
              <rect
                x={omX}
                y={omY}
                width={barWidth}
                height={omH}
                fill={OM_COLOR}
                rx={2}
                onClick={() => onBarSelect?.(`${d.label}: OM ${fmt(d.om)} ${pressureLabel}`)}
              >
                <title>{`OM: ${fmt(d.om)} ${pressureLabel}`}</title>
              </rect>
              <rect
                x={pfX}
                y={pfY}
                width={barWidth}
                height={pfH}
                fill={PF_COLOR}
                rx={2}
                onClick={() => onBarSelect?.(`${d.label}: PF ${fmt(d.pf)} ${pressureLabel}`)}
              >
                <title>{`PF: ${fmt(d.pf)} ${pressureLabel}`}</title>
              </rect>
              {/* labels */}
              <text x={groupX + catWidth/2} y={height - margin.bottom + 16} textAnchor="middle" fontSize="10" fill="#475569">{d.label}</text>
            </g>
          );
        })}
        </svg>
      </Box>
    </Box>
  );
}
