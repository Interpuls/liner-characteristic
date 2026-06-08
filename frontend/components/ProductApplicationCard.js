import { useMemo } from "react";
import { useRouter } from "next/router";
import { Box, HStack, Stack, Text, Tooltip, SimpleGrid, VStack, Divider, Heading, Tag, TagLabel, IconButton, Icon } from "@chakra-ui/react";
import { AppSizePill } from "./ui/AppSizePill";
import { formatTeatSize } from "../lib/teatSizes";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";

const BARREL_SHAPE_ICON = {
  round: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  triangular: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <polygon points="12 4 20 18 4 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  squared: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
};
const BARREL_SHAPE_LABEL = { round: "Round", triangular: "Triangular", squared: "Squared" };

// Small helper for score color
const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "rgba(120, 224, 116, 1)" :
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
    <Tooltip
      label={score != null ? `${code}: score ${score}/4 – value: ${rawVal != null ? rawVal : "n/a"}` : `${code}: n/a`}
      hasArrow
    >
      <Box
        textAlign="center"
        w={{ base: "32px", md: "44px" }}
        minW={{ base: "32px", md: "44px" }}
        borderRadius="lg"
        overflow="hidden"
        boxShadow="sm"
        bg={scoreColor(score)}
        color="white"
      >
        <Box px={1} py={1} bg="rgba(255,255,255,0.15)">
          <Text fontSize={{ base: "8px", md: "10px" }} fontWeight="semibold" lineHeight="short" letterSpacing="wider" textTransform="uppercase">
            {KPI_ABBR[code] || code}
          </Text>
        </Box>
        <Box py={{ base: 1, md: 2 }}>
          <Text fontSize={{ base: "sm", md: "xl" }} fontWeight="bold" lineHeight="short" letterSpacing="tight">
            {score != null ? score : "–"}
          </Text>
        </Box>
      </Box>
    </Tooltip>
  );
}

export default function ProductApplicationCard({
  productId,
  brand,
  model,
  sizeMm,
  compound,
  barrelShape,
  isAdmin,
  applicationId,
  kpis,
  isPinned = false,
  onTogglePin,
}) {
  const router = useRouter();

  const sizeLabel = useMemo(() => formatTeatSize(sizeMm), [sizeMm]);
  const shapeKey = (barrelShape || "").toLowerCase();
  const ShapeIcon = BARREL_SHAPE_ICON[shapeKey] || null;
  const shapeLabel = BARREL_SHAPE_LABEL[shapeKey] || null;

  const goToDetails = () => {
    const q = new URLSearchParams({ brand: String(brand || ""), model: String(model || "") });
    if (sizeMm != null) q.set("teat_size", String(sizeMm));
    const from = encodeURIComponent(router.asPath || "/product/result");
    router.push(`/idcard/idresult?${q.toString()}&from=${from}`);
  };

  return (
    <Box
      w="100%"
      maxW="100%"
      minW={0}
      borderWidth="1px"
      borderColor={isPinned ? "blue.500" : "gray.200"}
      rounded="md"
      p={4}
      position="relative"
      role="button"
      tabIndex={0}
      cursor="pointer"
      _hover={{ shadow: "sm", borderColor: isPinned ? "blue.500" : "blue.300" }}
      boxShadow={isPinned ? "0 0 0 1px var(--chakra-colors-blue-500)" : undefined}
      onClick={goToDetails}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDetails(); } }}
    >
      <IconButton
        aria-label={isPinned ? "Unpin card" : "Pin card"}
        icon={isPinned ? <BsPinAngleFill /> : <BsPinAngle />}
        size="sm"
        variant="ghost"
        color={isPinned ? "blue.500" : "gray.500"}
        _hover={{ bg: "blue.50", color: "blue.600" }}
        position="absolute"
        top={2}
        right={2}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin?.();
        }}
      />
      <Stack spacing={2}>
        {/* Header: left details and KPI row on desktop */}
        <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'flex-start' }}>
          <VStack align="start" spacing={0} flex="1" minW={0}>
            <HStack spacing={2} align="center" flexWrap="wrap" w="100%" justify={{ base: "space-between", md: "flex-start" }}>
              <HStack spacing={2} align="center" flexWrap="wrap" flex="1" minW="0">
                <Heading size="sm" fontWeight="bold" lineHeight={1}>{model || "-"}</Heading>
                <Text color="gray.600" fontWeight="normal" fontSize="xs" display={{ base: "inline-flex", md: "none" }}>
                  {brand || "-"}
                </Text>
                {ShapeIcon ? (
                  <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                    <Box as="span" display="inline-flex" alignItems="center">
                      <ShapeIcon boxSize={4} color="blue.500" />
                    </Box>
                  </Tooltip>
                ) : null}
                {sizeLabel ? (
                  <Box
                    as="span"
                    px={2}
                    py={0.5}
                    borderWidth="1px"
                    borderRadius="full"
                    fontSize="10px"
                    color="blue.500"
                    bg="gray.100"
                    fontWeight="medium"
                    textTransform="capitalize"
                    display={{ base: "inline-flex", md: "none" }}
                  >
                    {sizeLabel}
                  </Box>
                ) : null}
                {isAdmin && compound ? (
                  <Box
                    as="span"
                    px={2}
                    py={0.5}
                    borderWidth="1px"
                    borderRadius="full"
                    fontSize="10px"
                    color="blue.500"
                    bg="gray.100"
                    fontWeight="medium"
                    textTransform="capitalize"
                    display={{ base: "inline-flex", md: "none" }}
                  >
                    {compound}
                  </Box>
                ) : null}
              </HStack>
            </HStack>
            <Text color="gray.600" fontWeight="normal" display={{ base: "none", md: "block" }}>{brand || "-"}</Text>
          </VStack>

          <HStack
            spacing={2}
            flexWrap="nowrap"
            align="center"
            justify="space-between"
            display={{ base: 'none', md: 'flex' }}
            flex="1"
            minW={0}
            pt={2}
            pb={1}
            pl={4}
            pr={10}
            overflowX="auto"
          >
            {KPI_ORDER.map((code) => (
              <KpiChip key={code} code={code} value={kpis?.[code]} />
            ))}
          </HStack>
        </Stack>

        {/* Divider + grid KPIs for mobile */}
        <SimpleGrid display={{ base: 'grid', md: 'none' }} columns={{ base: 9, md: 9 }} gap={{ base: 1, md: 2 }}>
          {KPI_ORDER.map((code) => (
            <KpiChip key={code} code={code} value={kpis?.[code]} />
          ))}
        </SimpleGrid>

        {!applicationId && (
          <Text fontSize="xs" color="gray.500">No application found for this size.</Text>
        )}
      </Stack>
    </Box>
  );
}
