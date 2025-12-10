import { useEffect, useMemo, useState } from "react";
import { Box, SimpleGrid, Text, useToast, Spinner, Center, VStack, HStack } from "@chakra-ui/react";
import { getToken } from "../../lib/auth";
import { listProductApplications, getKpiValuesByPA } from "../../lib/api";
import { latestKpiByCode } from "../../lib/kpi";
import ApplicationKpiCard from "./ApplicationKpiCard";
import { formatTeatSize } from "../../lib/teatSizes";

const KPI_ORDER = [
  'CLOSURE','FITTING','CONGESTION_RISK','HYPERKERATOSIS_RISK','SPEED','RESPRAY','FLUYDODINAMIC','SLIPPAGE','RINGING_RISK'
];
const COLORS = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"]; // 4 apps
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const polarToCart = (cx, cy, r, angleRad) => ({ x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) });

export default function KpisTab({ product, isAdmin }) {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kpisByApp, setKpisByApp] = useState({}); // appId -> {byCode}
  const [hiddenIds, setHiddenIds] = useState(new Set());

  const pid = product?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pid) { setApps([]); return; }
      const t = getToken();
      if (!t) return;
      setLoading(true);
      try {
        const list = await listProductApplications(t, pid);
        const arr = Array.isArray(list) ? list : [];
        if (alive) setApps(arr);
        // prefetch KPIs for radar and cards
        const entries = await Promise.all(arr.map(async (a) => {
          try {
            const values = await getKpiValuesByPA(t, a.id);
            return [a.id, latestKpiByCode(values)];
          } catch { return [a.id, {}]; }
        }));
        if (alive) setKpisByApp(Object.fromEntries(entries));
      } catch (e) {
        // non-bloccante: mostro messaggio leggero
        toast({ status: "error", title: "Cannot load applications" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [pid, toast]);

  // Build radar series for up to 4 applications
  const radarApps = useMemo(() => (apps || []).slice(0, 4), [apps]);
  const radarSeries = useMemo(() => {
    return radarApps.map((a) => ({
      appId: a.id,
      label: formatTeatSize(a?.size_mm),
      byCode: kpisByApp[a.id] || {},
    }));
  }, [radarApps, kpisByApp]);

  if (!pid) {
    return <Box py={8} textAlign="center" color="gray.600">No product selected.</Box>;
  }

  if (loading) {
    return (
      <Center py={8} color="gray.600">
        <Spinner size="sm" mr={2} />
        <Text>Loading applications…</Text>
      </Center>
    );
  }

  if (!apps.length) {
    return <Box py={8} textAlign="center" color="gray.600">No applications for this product.</Box>;
  }

  return (
    <VStack align="stretch" spacing={{ base: 0, md: 3 }}>
      <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4}>
        {apps.map((a) => (
          <ApplicationKpiCard key={a.id} application={a} product={product} kpisByCode={kpisByApp[a.id]} />
        ))}
      </SimpleGrid>

      {radarSeries.length > 0 && (
        <VStack align="stretch" spacing={{ base: 0, md: 2 }}>
          <ResponsiveRadar series={radarSeries} hidden={hiddenIds} />
          <Legend
            items={radarSeries}
            hidden={hiddenIds}
            onToggle={(id) => setHiddenIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
          />
          <Text fontSize="xs" color="gray.500">Values are on a 0–4 scale per KPI.</Text>
        </VStack>
      )}
    </VStack>
  );
}

function Legend({ items, hidden, onToggle }) {
  return (
    <HStack wrap="wrap" spacing={2}>
      {items.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        const isHidden = hidden?.has(s.appId);
        return (
          <HStack
            key={s.appId}
            spacing={2}
            px={2}
            py={1}
            borderWidth="1px"
            borderRadius="full"
            borderColor={color}
            bg={isHidden ? 'gray.50' : 'white'}
            cursor="pointer"
            onClick={() => onToggle?.(s.appId)}
            opacity={isHidden ? 0.5 : 1}
          >
            <Box w="10px" h="10px" borderRadius="full" bg={color} />
            <Text fontSize="sm" textDecoration={isHidden ? 'line-through' : 'none'}>{s.label}</Text>
          </HStack>
        );
      })}
    </HStack>
  );
}

function ResponsiveRadar({ series, hidden }) {
  // simple fixed size for tab embedding
  const width = 560;
  const height = 420;
  const colored = series.map((s, i) => ({ ...s, _colorIndex: i }));
  const visible = colored.filter(s => !(hidden?.has(s.appId)));
  return (
    <Box w="100%" display="flex" justifyContent="center">
      <RadarChart width={width} height={height} series={visible} />
    </Box>
  );
}

function RadarChart({ width = 560, height = 420, series = [] }) {
  const margin = 40;
  const cx = width / 2;
  const cy = height / 2 + 10;
  const radius = Math.min(width, height) / 2 - margin;
  const axes = KPI_ORDER;
  const levels = 4; // grid levels for 0–4 scale
  const angleFor = (i) => (Math.PI * 2 * i / axes.length) - Math.PI / 2; // start at top

  const polys = series.map((s, idx) => {
    const pts = axes.map((code, i) => {
      const sc = Number(s.byCode?.[code]?.score ?? 0);
      const norm = clamp01(sc / 4);
      const r = radius * norm;
      const ang = angleFor(i);
      const p = polarToCart(cx, cy, r, ang);
      return `${p.x},${p.y}`;
    });
    const color = COLORS[(s._colorIndex ?? idx) % COLORS.length];
    return { color, pointsAttr: pts.join(' ') };
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[...Array(levels)].map((_, li) => {
        const r = radius * ((li + 1) / levels);
        return <circle key={li} cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {axes.map((code, i) => {
        const p = polarToCart(cx, cy, radius, angleFor(i));
        const lp = polarToCart(cx, cy, radius + 16, angleFor(i));
        const anchor = Math.abs(Math.cos(angleFor(i))) < 0.3 ? 'middle' : (Math.cos(angleFor(i)) > 0 ? 'start' : 'end');
        return (
          <g key={code}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1" />
            <text x={lp.x} y={lp.y} textAnchor={anchor} fontSize="10" fill="#475569">{code}</text>
          </g>
        );
      })}
      {polys.map((poly, i) => (
        <g key={i}>
          <polygon points={poly.pointsAttr} fill={polys[i].color + '33'} stroke={polys[i].color} strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
