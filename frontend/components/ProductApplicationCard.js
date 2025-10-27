import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Box, HStack, Stack, Text, Tooltip, SimpleGrid, Stat, StatNumber, VStack, useToast, Divider, Heading, Tag, TagLabel } from "@chakra-ui/react";
import { getToken } from "../lib/auth";
import { listProductApplications, getKpiValuesByPA } from "../lib/api";
import { latestKpiByCode } from "../lib/kpi";
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
      <Text fontSize={{ base: "9px", md: "12px" }} color="gray.600" lineHeight="shorter" noOfLines={1}>
        {KPI_ABBR[code] || code}
      </Text>
      <Tooltip
        label={score != null ? `${code}: score ${score}/4 – value: ${rawVal != null ? rawVal : "n/a"}` : `${code}: n/a`}
        hasArrow
      >
        <Stat p={{ base: 0.5, md: 2 }} borderWidth="1px" borderRadius="md" bg={scoreColor(score)} w={{ base: "28px", md: "40px" }} textAlign="center">
          <StatNumber fontSize={{ base: "sm", md: "lg" }} color="white" lineHeight="short">
            {score != null ? score : "–"}
          </StatNumber>
        </Stat>
      </Tooltip>
    </VStack>
  );
}

export default function ProductApplicationCard({ productId, brand, model, sizeMm, compound, isAdmin }) {
  const toast = useToast();
  const router = useRouter();
  const [paId, setPaId] = useState(null);
  const [kpis, setKpis] = useState(null); // map by code
  const [loading, setLoading] = useState(true);
  // Fixed KPI list for performance

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
        const latest = latestKpiByCode(values);
        if (alive) setKpis(latest);
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

  const goToDetails = () => {
    const q = new URLSearchParams({ brand: String(brand || ""), model: String(model || "") });
    if (sizeMm != null) q.set("teat_size", String(sizeMm));
    const from = encodeURIComponent(router.asPath || "/product/result");
    router.push(`/idcard/idresult?${q.toString()}&from=${from}`);
  };

  return (
    <Box
      borderWidth="1px"
      rounded="md"
      p={4}
      role="button"
      tabIndex={0}
      cursor="pointer"
      _hover={{ shadow: "sm", borderColor: "blue.300" }}
      onClick={goToDetails}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDetails(); } }}
    >
      <Stack spacing={2}>
        {/* Header: left details, right KPIs (desktop) */}
        <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'center' }}>
          <VStack align="start" spacing={0}>
            <Heading size="sm" fontWeight="bold">{model || "-"}</Heading>
            <Text color="gray.600" fontWeight="normal">{brand || "-"}</Text>
            <Stack direction={{ base: 'row', md: 'column' }} align="start" spacing={{ base: 1, md: 3 }} mt={1}>
              <AppSizePill color="blue" size="xs">{sizeLabel}</AppSizePill>
              {isAdmin && compound ? (
                <Tag size="sm" variant="subtle"><TagLabel>Compound: {compound}</TagLabel></Tag>
              ) : null}
            </Stack>
          </VStack>
          {/* KPIs inline on desktop */}
          <HStack spacing={{ base: 1, md: 5 }} display={{ base: 'none', md: 'flex' }}>
            {KPI_ORDER.map((code) => (
              <KpiChip key={code} code={code} value={kpis?.[code]} />
            ))}
          </HStack>
        </Stack>

        {/* Divider + grid KPIs for mobile */}
        <Divider my={1} display={{ base: 'block', md: 'none' }} />
        <SimpleGrid display={{ base: 'grid', md: 'none' }} columns={{ base: 9, md: 9 }} gap={{ base: 1, md: 2 }}>
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
