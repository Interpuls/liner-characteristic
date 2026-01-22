import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Box, Heading, Text, VStack, Card, CardHeader, CardBody, HStack, Spinner, Badge, useBreakpointValue } from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { getToken } from "../../lib/auth";
import { getKpiValuesByPA, listProductApplications, getProduct, getMe } from "../../lib/api";
import { latestKpiByCode } from "../../lib/kpi";
import { formatTeatSize } from "../../lib/teatSizes";

const KPI_ORDER = [
  'CLOSURE','FITTING','CONGESTION_RISK','HYPERKERATOSIS_RISK','SPEED','RESPRAY','FLUYDODINAMIC','SLIPPAGE','RINGING_RISK'
];

const COLORS = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]; // up to 5

function polarToCart(cx, cy, r, angleRad) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

export default function RadarMapPage() {
  const router = useRouter();
  const { app_ids, ids, keys, from } = router.query;
  const selectedIds = useMemo(() => {
    const v = (typeof app_ids === 'string' && app_ids) ? app_ids
            : (typeof ids === 'string' && ids) ? ids : '';
    return v ? v.split(',').map(s=>s.trim()).filter(Boolean) : [];
  }, [app_ids, ids]);
  const selectedKeys = useMemo(() => {
    return (typeof keys === 'string' && keys) ? keys.split(',').map(s=>s.trim()).filter(Boolean) : [];
  }, [keys]);
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  const [loading, setLoading] = useState(false);
  // series: [{ appId, label, byCode: { [code]: {score, value_num} } }]
  const [series, setSeries] = useState([]);
  const [error, setError] = useState('');
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  // Build app ids and labels. Prefer explicit app_ids, fallback to keys mapping.
  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      const token = getToken();
      if (!token) { window.location.replace('/login'); return; }
      setLoading(true); setError('');
      try {
        try {
          const me = await getMe(token);
          setIsAdmin(me?.role === "admin");
        } catch {}

        let items = [];
        if (selectedIds.length > 0 && selectedKeys.length > 0 && selectedIds.length === selectedKeys.length) {
          // Zip ids and keys to use model labels
          const pairs = selectedIds.map((id, i) => ({ id: Number(id), key: selectedKeys[i] }));
          const uniqPids = [...new Set(pairs.map(p => Number(String(p.key).split('-')[0])))]
            .filter(n => Number.isFinite(n));
          const prodByPid = new Map();
          await Promise.all(uniqPids.map(async (pid) => {
            try { const prod = await getProduct(token, pid); prodByPid.set(pid, prod); } catch {}
          }));
          items = pairs.map(({ id, key }) => {
            const [pidStr, sizeStr] = String(key).split('-');
            const pid = Number(pidStr);
            const sizeMm = Number(sizeStr);
            const prod = prodByPid.get(pid);
            const label = prod?.model || `App ${id}`;
            return { appId: id, label, sizeMm: Number.isFinite(sizeMm) ? sizeMm : undefined, compound: prod?.compound };
          });
        } else if (selectedKeys.length > 0) {
          // keys format: `${productId}-${sizeMm}`
          const byPid = new Map();
          const uniqPids = [...new Set(selectedKeys.map(k => Number((k||'').split('-')[0])))]
            .filter(n => Number.isFinite(n));
          // fetch product info and its applications for each unique product id
          await Promise.all(uniqPids.map(async (pid) => {
            try {
              const [prod, apps] = await Promise.all([
                getProduct(token, pid),
                listProductApplications(token, pid),
              ]);
              byPid.set(pid, { prod, apps });
            } catch {}
          }));
          items = selectedKeys.map((k) => {
            const [pidStr, sizeStr] = String(k).split('-');
            const pid = Number(pidStr);
            const size = Number(sizeStr);
            const entry = byPid.get(pid) || {};
            const match = (Array.isArray(entry.apps) ? entry.apps : []).find(a => Number(a.size_mm) === size);
            const appId = match ? Number(match.id) : undefined;
            const prod = entry.prod;
            const model = prod?.model || '';
            const label = model || `App ${appId ?? ''}`;
            return appId ? { appId, label, sizeMm: Number.isFinite(size) ? size : undefined, compound: prod?.compound } : null;
          }).filter(Boolean);
        } else if (selectedIds.length > 0) {
          // Fallback: ids only, no keys -> generic label
          items = selectedIds.map((id) => ({ appId: Number(id), label: `App ${id}` }));
        }

        // Fetch KPI values per application id and build series
        const result = [];
        await Promise.all(items.map(async (it) => {
          try {
            const values = await getKpiValuesByPA(token, it.appId);
            const latest = latestKpiByCode(values);
            const byCode = Object.fromEntries(Object.entries(latest).map(([code, v]) => [code, { score: v.score, value_num: v.value_num }]));
            result.push({ appId: it.appId, label: it.label, sizeMm: it.sizeMm, compound: it.compound, byCode });
          } catch (e) {
            result.push({ appId: it.appId, label: it.label, sizeMm: it.sizeMm, compound: it.compound, byCode: {} });
          }
        }));
        setSeries(result);
      } catch (e) {
        setError(e?.message || 'Errore caricando i dati');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router.isReady, selectedIds.join(','), selectedKeys.join(',')]);

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Radar Map" subtitle="Compare product performance graphically" backHref={backHref} showInfo={false} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} w="100%" mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        <Card mx={{ base: -4, md: 0 }}>
          <CardBody pt={3}>
            {loading ? (
              <VStack py={10} spacing={3}>
                <Spinner />
                <Text color="gray.600">Loading KPI scores…</Text>
              </VStack>
            ) : error ? (
              <VStack py={6}>
                <Text color="red.500" fontSize="sm">{error}</Text>
              </VStack>
            ) : series.length === 0 ? (
              <VStack py={6}>
                <Text color="gray.600" fontSize="sm">Nessuna selezione valida.</Text>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Legend
                  items={series}
                  hidden={hiddenIds}
                  isAdmin={isAdmin}
                  onToggle={(id) => setHiddenIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                />
                <ResponsiveRadar series={series} hidden={hiddenIds} />
                <Text fontSize="xs" color="gray.500">Values are on a 0–4 scale per KPI.</Text>
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}

function Legend({ items, hidden, onToggle, isAdmin }) {
  return (
    <HStack wrap="wrap" spacing={2}>
      {items.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        const isHidden = hidden?.has(s.appId);
        const hasSize = Number.isFinite(s.sizeMm);
        const subtitle = (() => {
          const parts = [];
          if (hasSize) parts.push(formatTeatSize(s.sizeMm));
          if (isAdmin && s.compound) parts.push(s.compound);
          return parts.join(" • ");
        })();
        return (
          <HStack
            key={s.appId}
            spacing={2}
            px={2}
            py={1}
            minW="140px"
            borderWidth="1px"
            borderRadius="full"
            borderColor="gray.200"
            bg="white"
            cursor="pointer"
            onClick={() => onToggle?.(s.appId)}
            opacity={isHidden ? 0.5 : 1}
          >
            <Box w="10px" h="10px" borderRadius="full" bg={color} />
            <VStack spacing={0} align="start">
              <Text fontSize="sm" color="gray.700" textDecoration={isHidden ? 'line-through' : 'none'}>
                {s.label}
              </Text>
              {subtitle ? (
                <Text fontSize="xs" color="gray.500" textDecoration={isHidden ? 'line-through' : 'none'}>
                  {subtitle}
                </Text>
              ) : null}
            </VStack>
          </HStack>
        );
      })}
    </HStack>
  );
}

function ResponsiveRadar({ series, hidden }) {
  const svgWidth = useBreakpointValue({ base: 300, sm: 340, md: 560 });
  const svgHeight = useBreakpointValue({ base: 300, sm: 320, md: 420 });
  const colored = series.map((s, i) => ({ ...s, _colorIndex: i }));
  const visible = colored.filter(s => !(hidden?.has(s.appId)));
  return (
    <Box w="100%" display="flex" justifyContent="center">
      <RadarChart width={svgWidth} height={svgHeight} series={visible} />
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

  // Build polygons for each series
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
      {/* Grid circles */}
      {[...Array(levels)].map((_, li) => {
        const r = radius * ((li + 1) / levels);
        return <circle key={li} cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* Axes */}
      {axes.map((code, i) => {
        const p = polarToCart(cx, cy, radius, angleFor(i));
        // label position slightly outside
        const lp = polarToCart(cx, cy, radius + 16, angleFor(i));
        const anchor = Math.abs(Math.cos(angleFor(i))) < 0.3 ? 'middle' : (Math.cos(angleFor(i)) > 0 ? 'start' : 'end');
        return (
          <g key={code}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1" />
            <text x={lp.x} y={lp.y} textAnchor={anchor} fontSize="10" fill="#475569">{code}</text>
          </g>
        );
      })}
      {/* Polygons */}
      {polys.map((poly, i) => (
        <g key={i}>
          <polygon points={poly.pointsAttr} fill={poly.color + '33'} stroke={poly.color} strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
