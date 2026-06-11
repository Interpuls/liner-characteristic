import { Box, Text, HStack, Stack, Tag, TagLabel, Flex, Grid, IconButton, Icon, Tooltip } from "@chakra-ui/react";
import { BsPinAngleFill } from "react-icons/bs";
import { formatTeatSize } from "../../lib/teatSizes";

const RESULT_KPIS = [
  { code: "CLOSURE", abbr: "CLS" },
  { code: "FITTING", abbr: "FIT" },
  { code: "CONGESTION_RISK", abbr: "CGR" },
  { code: "HYPERKERATOSIS_RISK", abbr: "HKR" },
  { code: "SPEED", abbr: "SPD" },
  { code: "RESPRAY", abbr: "RSP" },
  { code: "FLUYDODINAMIC", abbr: "FLD" },
  { code: "SLIPPAGE", abbr: "SLP" },
  { code: "RINGING_RISK", abbr: "RNG" },
];

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

const scoreColor = (score) => {
  if (score >= 4) return "#2f9d61";
  if (score === 3) return "#72bf44";
  if (score === 2) return "#e3a224";
  if (score === 1) return "#ef4444";
  return "#cbd5e1";
};
const RESULT_GRID_TEMPLATE = {
  base: "minmax(84px, 0.9fr) 30px repeat(9, minmax(26px, 1fr))",
  md: "460px 0px repeat(9, minmax(70px, 1fr))",
};

function ScoreBlock({ value, isFirst, isLast }) {
  const score = value?.score ?? null;
  return (
    <Flex
      align="center"
      justify="center"
      h={{ base: "30px", md: "40px" }}
      minW={{ base: "27px", md: "76px" }}
      w="100%"
      bg={scoreColor(score)}
      color="white"
      fontSize={{ base: "sm", md: "sm" }}
      fontWeight="800"
      borderLeftWidth="2px"
      borderLeftColor="white"
      borderTopLeftRadius={isFirst ? "8px" : 0}
      borderBottomLeftRadius={isFirst ? "8px" : 0}
      borderTopRightRadius={isLast ? "8px" : 0}
      borderBottomRightRadius={isLast ? "8px" : 0}
    >
      {score ?? "-"}
    </Flex>
  );
}
export default function PinnedLinerOverlay({
  item,
  index,
  kpiScores,
  appIdByKey,
  isAdmin,
  onUnpin,
  onOpenDetails,
}) {
  if (!item) return null;

  return (
    <Box
      position="fixed"
      top={{
        base: `${10 + index * 84}px`,
        md: `${12 + index * 78}px`,
      }}
      left={0}
      right={0}
      transform="none"
      w="100%"
      maxW="100%"
      px={{ base: 0, md: 0 }}
      zIndex={1400}
      borderWidth="1px"
      borderColor="blue.200"
      borderRadius="16px"
      bg="white"
      boxShadow="0 18px 40px rgba(15, 23, 42, 0.18)"
      overflowX={{ base: "hidden", md: "auto" }}
      overflowY="hidden"
      css={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Grid
        templateColumns={RESULT_GRID_TEMPLATE}
        alignItems="center"
        minH={{ base: "76px", md: "66px" }}
        minW={{ base: "100%", md: "960px" }}
        cursor="pointer"
        onClick={() => onOpenDetails(item)}
      >
        <HStack px={{ base: "5px", md: 4 }} spacing={{ base: 0, md: 2 }} minW={0}>
          <IconButton
            aria-label="Unpin liner"
            icon={<BsPinAngleFill />}
            size="m"
            display={{ base: "none", md: "inline-flex" }}
            variant="ghost"
            color="#3b82f6"
            _hover={{ bg: "blue.50", color: "blue.600" }}
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
          />
          <Box minW={0} flex="1" pt={{ base: 0, md: 0 }}>
            <HStack spacing={1} align={{ base: "flex-start", md: "center" }} minW={0}>
            
              <Text
                fontSize={{ base: "12px", md: "sm" }}
                fontWeight="800"
                color="#253044"
                noOfLines={{ base: undefined, md: 1 }}
                whiteSpace={{ base: "normal", md: "nowrap" }}
                wordBreak="normal"
                overflowWrap="normal"
                lineHeight={{ base: "1.12", md: "normal" }}
                minW={0}
              >
                {item.model || "-"}
              </Text>
                {(() => {
                      const shapeKey = String(item.barrel_shape || "").toLowerCase();
                      const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                      const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                      return ShapeIcon ? (
                        <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                          <HStack display={{ base: "none", md: "flex" }} align="center" spacing={1} px={1.5} py={0.5} borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                                <ShapeIcon boxSize={3} />
                                <Text fontSize="10px" fontWeight="semibold" textTransform="capitalize">
                                  {shapeLabel}
                                </Text>
                              </HStack>
                        </Tooltip>
                      ) : null;
                    })()}
            </HStack>
            <Stack mt={{ base: 0.5, md: 0.5 }} spacing={{ base: 0.5, md: 1 }} align="flex-start" minW={0}>
                <Text fontSize={{ base: "11px", md: "xs" }} fontWeight="700" color="#8a98aa" whiteSpace="normal" wordBreak="normal" overflowWrap="normal" lineHeight="1.1">
                  {item.brand || "-"}
                </Text>
                <HStack spacing={{ base: 1, md: 2 }} flexWrap="nowrap" align="center" mt={{ base: 0, md: 0 }}>
                  <Tag size={{ base: "xs", md: "sm" }} bg="#eef3f8" color="#2f67bf" borderRadius="7px" px={{ base: 1.5, md: 2 }} py={{ base: 0, md: 0 }}>
                    <TagLabel fontSize={{ base: "10px", md: "11px" }} fontWeight="800">{formatTeatSize(item.size_mm)}</TagLabel>
                  </Tag>
                  {(isAdmin && item.compound) ? (
                    <Tag size={{ base: "xs", md: "sm" }} bg="#eef3f8" color="#52677f" borderRadius="7px" px={{ base: 1.5, md: 2 }} py={{ base: 0, md: 0 }}>
                      <TagLabel fontSize={{ base: "10px", md: "11px" }} fontWeight="800">{item.compound}</TagLabel>
                    </Tag>
                  ) : null}
                  {(() => {
                    const shapeKey = String(item.barrel_shape || "").toLowerCase();
                    const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                    const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                    return ShapeIcon ? (
                      <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                        <HStack display={{ base: "flex", md: "none" }} align="center" justify="center" minW="20px" h="20px" borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                          <ShapeIcon boxSize={3} />
                        </HStack>
                      </Tooltip>
                    ) : null;
                  })()}
                  {!appIdByKey[item.key] ? (
                    <Text fontSize={{ base: "10px", md: "11px" }} color="#a0aec0">No application</Text>
                  ) : null}
                </HStack>
            </Stack>
          </Box>
        </HStack>

        <Flex align="center" justify="center">
          <IconButton
            aria-label="Unpin liner"
            icon={<BsPinAngleFill size="18px" />}
            size="xs"
            minW="26px"
            w="26px"
            h="26px"
            display={{ base: "inline-flex", md: "none" }}
            variant="ghost"
            color="#3b82f6"
            _hover={{ bg: "blue.50", color: "blue.600" }}
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
          />
        </Flex>

        {RESULT_KPIS.map((kpi, index) => (
          <ScoreBlock
            key={kpi.code}
            value={kpiScores[item.key]?.[kpi.code]}
            isFirst={index === 0}
            isLast={index === RESULT_KPIS.length - 1}
          />
        ))}
      </Grid>
    </Box>
  );
}

