import { useEffect, useMemo, useState } from "react";
import { Box, HStack, Stack, Text, Tooltip, SimpleGrid, Stat, StatNumber, VStack, useToast } from "@chakra-ui/react";
import { getToken } from "../lib/auth";
import { listProductApplications, getKpiValuesByPA } from "../lib/api";
import { AppSizePill } from "./ui/AppSizePill";

// Small helper for score color
const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "green.400" :
  s === 2 ? "yellow.500" :
  s === 1 ? "red.500" : "gray.400";

// Order of the 9 KPIs to render
const KPI_ORDER = [
  "CLOSURE",
  "FITTING",
  "CONGESTION_RISK",
  "HYPERKERATOSIS_RISK",
  "SPEED",
  "RESPRAY",
  "FLUYDODINAMIC",
  "SLIPPAGE",
  "RINGING_RISK",
];

const KPI_ABBR = {
  CLOSURE: "CLS",
  FITTING: "FIT",
  CONGESTION_RISK: "CGR",
  HYPERKERATOSIS_RISK: "HKR",
  SPEED: "SPD",
  RESPRAY: "RSP",
  FLUYDODINAMIC: "FLD",
  SLIPPAGE: "SLP",
  RINGING_RISK: "RNG",
};

function KpiChip({ code, value }) {
  const score = value?.score ?? null;
  const rawVal = value?.value_num ?? null;
  return (
    <VStack spacing={1} align="center">
      <Text fontSize="9px" color="gray.600" lineHeight="shorter" noOfLines={1}>
        {KPI_ABBR[code] || code}
      </Text>
      <Tooltip
        label={score != null ? `${code}: score ${score}/4 — value: ${rawVal != null ? rawVal : "n/a"}` : `${code}: n/a`}
        hasArrow
      >
        <Stat p={0.5} borderWidth="1px" borderRadius="md" bg={scoreColor(score)} w="28px" textAlign="center">
          <StatNumber fontSize="sm" color="white" lineHeight="short">
            {score != null ? score : "—"}
          </StatNumber>
        </Stat>
      </Tooltip>
    </VStack>
  );
}

export default function ProductApplicationCard({ productId, brand, model, sizeMm }) {
  const toast = useToast();
  const [paId, setPaId] = useState(null);
  const [kpis, setKpis] = useState(null); // map by code
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t || !productId || !sizeMm) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // find application id for the given size
        const apps = await listProductApplications(t, productId);
        const found = (apps || []).find(a => Number(a.size_mm) === Number(sizeMm));
        if (!found) {
          if (alive) { setPaId(null); setKpis({}); }
          setLoading(false);
          return;
        }
        if (alive) setPaId(found.id);
        // fetch KPI values for that application
        const values = await getKpiValuesByPA(t, found.id);
        const map = Object.fromEntries((values || []).map(v => [v.kpi_code, v]));
        if (alive) setKpis(map);
      } catch (e) {
        // silent; optionally show toast
        // toast({ status: "error", title: "Cannot load KPIs" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [productId, sizeMm]);

  const sizeLabel = useMemo(() => `${sizeMm} mm`, [sizeMm]);

  return (
    <Box borderWidth="1px" rounded="md" p={4}>
      <Stack spacing={2}>
        <HStack justify="space-between" align="center">
          <Text>
            <Text as="span" fontWeight="normal">{brand || "-"}</Text>
            {" • "}
            <Text as="span" fontWeight="semibold">{model || "-"}</Text>
          </Text>
          <AppSizePill color="blue" size="xs">{sizeLabel}</AppSizePill>
        </HStack>
        <SimpleGrid columns={{ base: 9, md: 9 }} gap={{ base: 1, md: 2 }}>
          {KPI_ORDER.map((code) => (
            <KpiChip key={code} code={code} value={kpis?.[code]} />
          ))}
        </SimpleGrid>
        {!paId && !loading && (
          <Text fontSize="xs" color="gray.500">No application found for this size.</Text>
        )}
      </Stack>
    </Box>
  );
}
