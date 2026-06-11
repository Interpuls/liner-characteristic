import { Box, Text, HStack, Stack, Tag, TagLabel, Flex, Grid, IconButton, Icon, Tooltip } from "@chakra-ui/react";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
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

const RESULT_TABLE_GRID_TEMPLATE = {
  base: "minmax(84px, 0.9fr) 30px repeat(9, minmax(26px, 1fr))",
  md: RESULT_GRID_TEMPLATE.md,
};
function ScoreBlock({ value, isFirst, isLast }) {
  const score = value?.score ?? null;
  return (
    <Flex
      align="center"
      justify="center"
      h={{ base: "34px", md: "40px" }}
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

export default function LinerResultsTable({
  rows,
  kpiScores,
  isAdmin,
  pinnedKeys,
  onTogglePin,
  onOpenDetails,
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="#e6ebf2"
      borderRadius="12px"
      overflow="hidden"
      bg="white"
    >
      <Box overflowX={{ base: "hidden", md: "auto" }}>
        <Grid
          templateColumns={RESULT_TABLE_GRID_TEMPLATE}
          minW={{ base: "100%", md: "960px" }}
          bg="#fbfcfe"
          borderBottomWidth="1px"
          borderBottomColor="#e6ebf2"
        >
          <Box px={{ base: "5px", md: 4 }} py={3}>
            <HStack spacing={2} align="center">
              <Box w={{ base: 0, md: "21px" }} flexShrink={0} />
              <Text fontSize={{ base: "sm", md: "sm" }} fontWeight="800" color="#718096">
                Liners
              </Text>
            </HStack>
          </Box>
          <Box />
          {RESULT_KPIS.map((kpi) => (
            <Flex key={kpi.code} align="center" justify="center" py={3}>
              <Text fontSize="xs" fontWeight="800" color="#718096">
                {kpi.abbr}
              </Text>
            </Flex>
          ))}
        </Grid>

        <Box minW={{ base: "100%", md: "960px" }}>
          {rows.map((item) => {
            const isPinned = pinnedKeys.includes(item.key);
            return (
              <Grid
                key={item.key}
                templateColumns={RESULT_TABLE_GRID_TEMPLATE}
                alignItems="center"
                minH="66px"
                position="relative"
                zIndex={isPinned ? 2 : 1}
                bg={isPinned ? "white" : "transparent"}
                boxShadow={isPinned ? "0 6px 14px rgba(15, 23, 42, 0.08)" : "none"}
                borderBottomWidth="1px"
                borderBottomColor="#edf2f7"
                cursor="pointer"
                _hover={{ bg: "#fbfcfe" }}
                onClick={() => onOpenDetails(item)}
              >
                <Box px={{ base: "5px", md: 4 }} py={{ base: 3, md: 0 }} minW={0}>
                  <HStack align="center" spacing={{ base: 0, md: 2 }} minW={0}>
                    <IconButton
                      aria-label={isPinned ? "Unpin liner" : "Pin liner"}
                      icon={isPinned ? <BsPinAngleFill /> : <BsPinAngle />}
                      size={isPinned ? "m" : "m"}
                      marginRight={"6px"}
                      display={{ base: "none", md: "inline-flex" }}
                      variant="ghost"
                      color={isPinned ? "#3b82f6" : "#cbd5e1"}
                      _hover={{ bg: "blue.50", color: "blue.500" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(item.key);
                      }}
                    />
                    
                    <Box minW={0} flex="1">
                      <HStack spacing={1} align={{ base: "flex-start", md: "center" }} justify="flex-start" minW={0}>
                        <Text
                          fontSize={{ base: "12px", md: "sm" }}
                          fontWeight="800"
                          color="#253044"
                          noOfLines={{ base: undefined, md: 1 }}
                          whiteSpace={{ base: "normal", md: "nowrap" }}
                          wordBreak="normal"
                          overflowWrap="normal"
                          lineHeight={{ base: "1.15", md: "normal" }}
                          minW={0}
                        >
                          {item.model || "-"}
                        </Text>
                        <IconButton
                          aria-label={isPinned ? "Unpin liner" : "Pin liner"}
                          icon={isPinned ? <BsPinAngleFill /> : <BsPinAngle />}
                          size="xs"
                          display="none"
                          variant="ghost"
                          color={isPinned ? "#3b82f6" : "#cbd5e1"}
                          _hover={{ bg: "blue.50", color: "blue.500" }}
                          flexShrink={0}
                          alignSelf="flex-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(item.key);
                          }}
                        />
                        {(() => {
                      const shapeKey = String(item.barrel_shape || "").toLowerCase();
                      const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                      const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                      return ShapeIcon ? (
                        <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                          <HStack display={{ base: "none", md: "flex" }} spacing={1} px={1.5} py={0.5} align="center" justify="center" minW="24px" h="24px" borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                            <ShapeIcon boxSize={4} />
                                <Text fontSize="10px" fontWeight="semibold" textTransform="capitalize">
                                  {shapeLabel}
                                </Text>
                          </HStack>
                        </Tooltip>
                      ) : null;
                    })()}
                    </HStack>
                      <HStack display={{ base: "flex", md: "none" }} mt={0.25} spacing={1} align="center" minW={0}>
                        <Stack spacing={0.5} align="flex-start" minW={0} flex="1">
                          <Text fontSize="10px" fontWeight="700" color="#8a98aa" whiteSpace="normal" wordBreak="normal" overflowWrap="normal" lineHeight="1.1">
                            {item.brand || "-"}
                          </Text>
                          <HStack spacing={1} flexWrap="nowrap" align="center">
                            <Tag size="xs" bg="#eef3f8" color="#2f67bf" borderRadius="7px" px={1}>
                              <TagLabel fontSize="10px" fontWeight="800">{formatTeatSize(item.size_mm)}</TagLabel>
                            </Tag>
                            {(isAdmin && item.compound) ? (
                              <Tag size="xs" bg="#eef3f8" color="#52677f" borderRadius="7px" px={1}>
                                <TagLabel fontSize="10px" fontWeight="800">{item.compound}</TagLabel>
                              </Tag>
                            ) : null}
                          </HStack>
                          <HStack spacing={1} align="center">
                            {(() => {
                          const shapeKey = String(item.barrel_shape || "").toLowerCase();
                          const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                          const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                          return ShapeIcon ? (
                            <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                              <HStack align="center" spacing={1} px={1.5} py={0.5} borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                                <ShapeIcon boxSize={3} />
                                <Text fontSize="10px" fontWeight="semibold" textTransform="capitalize">
                                  {shapeLabel}
                                </Text>
                              </HStack>
                            </Tooltip>
                          ) : null;
                        })()}
                          </HStack>
                        </Stack>
                      </HStack>
                      <Stack display={{ base: "none", md: "flex" }} direction="row" mt={0.5} spacing={2} align="center">
                        <Text fontSize="xs" fontWeight="700" color="#8a98aa" noOfLines={1}>
                          {item.brand || "-"}
                        </Text>
                        <HStack spacing={2} flexWrap="wrap" align="center">
                          <Tag size="sm" bg="#eef3f8" color="#2f67bf" borderRadius="7px" px={2}>
                            <TagLabel fontSize="11px" fontWeight="800">{formatTeatSize(item.size_mm)}</TagLabel>
                          </Tag>
                          {(isAdmin && item.compound) ? (
                            <Tag size="sm" bg="#eef3f8" color="#52677f" borderRadius="7px" px={2}>
                              <TagLabel fontSize="11px" fontWeight="800">{item.compound}</TagLabel>
                            </Tag>
                          ) : null}
                        </HStack>
                      </Stack>
                    </Box>
                  </HStack>
                </Box>

                <Flex align="center" justify="center" visibility={{ base: "visible", md: "hidden" }}>
                  <IconButton
                    aria-label={isPinned ? "Unpin liner" : "Pin liner"}
                    icon={isPinned ? <BsPinAngleFill size="18px" /> : <BsPinAngle size="18px" />}
                    size="xs"
                    minW="30px"
                    w="30px"
                    h="30px"
                    variant="ghost"
                    color={isPinned ? "#3b82f6" : "#cbd5e1"}
                    _hover={{ bg: "blue.50", color: "blue.500" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(item.key);
                    }}
                  />
                </Flex>

                {RESULT_KPIS.map((kpi, index) => (
                  <Box key={kpi.code} px={{ base: 0.5, md: 0 }}>
                    <ScoreBlock
                      value={kpiScores[item.key]?.[kpi.code]}
                      isFirst={index === 0}
                      isLast={index === RESULT_KPIS.length - 1}
                    />
                  </Box>
                ))}
              </Grid>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

