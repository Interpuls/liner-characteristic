import { useMemo } from "react";
import { Box, HStack, SimpleGrid, GridItem, Stat, StatNumber, Text, Tooltip, VStack, Divider } from "@chakra-ui/react";
// import { AppSizePill } from "../ui/AppSizePill";
import { formatTeatSize } from "../../lib/teatSizes";

// Small helper for score color
const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "rgba(120, 224, 116, 1)" :
  s === 2 ? "yellow.500" :
  s === 1 ? "red.500" : "gray.400";

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
      <Tooltip label={score != null ? `${code}: score ${score}/4 — value: ${rawVal ?? "n/a"}` : `${code}: n/a`} hasArrow>
        <Stat p={{ base: 0.5, md: 2 }} borderWidth="1px" borderRadius="md" bg={scoreColor(score)} w={{ base: "28px", md: "40px" }} textAlign="center">
          <StatNumber fontSize={{ base: "sm", md: "lg" }} color="white" lineHeight="short">
            {score != null ? score : "–"}
          </StatNumber>
        </Stat>
      </Tooltip>
    </VStack>
  );
}

export default function ApplicationKpiCard({ application, product, kpisByCode }) {
  const kpis = kpisByCode || {};

  const sizeLabel = useMemo(() => formatTeatSize(application?.size_mm), [application?.size_mm]);

  return (
    <Box borderWidth="1px" rounded="md" p={{ base: 4, md: 4 }} mx={{ base: -4, md: 0 }}>
      {/* Mobile: label sottile + valore mm in grassetto, su una sola riga */}
      <HStack justify="flex-start" align="baseline" mb={2} display={{ base: 'flex', md: 'none' }}>
        <Text fontSize="xs" color="gray.600">Teat size:</Text>
        <Text fontSize="sm" fontWeight="semibold" color="#12305f">{sizeLabel}</Text>
      </HStack>
      <Divider my={1} display={{ base: 'block', md: 'none' }} />

      {/* Grid KPI; su desktop includo anche il tag come primo item (due righe + pill) */}
      <SimpleGrid columns={{ base: 9, md: 12 }} gap={{ base: 1, md: 3 }} alignItems="center">
        <GridItem colSpan={{ base: 0, md: 3 }} display={{ base: 'none', md: 'block' }}>
          <VStack spacing={0.5} align="center">
            <Text fontSize="xs" color="gray.600" textAlign="center">Teat Size</Text>
            <Text fontSize="lg" fontWeight="semibold" textAlign="center" color="#12305f">{sizeLabel}</Text>
          </VStack>
        </GridItem>
        {KPI_ORDER.map((code) => (
          <GridItem key={code} colSpan={{ base: 1, md: 1 }}>
            <KpiChip code={code} value={kpis?.[code]} />
          </GridItem>
        ))}
      </SimpleGrid>
    </Box>
  );
}
