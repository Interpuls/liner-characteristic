import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

const SCORE_SCALE = [
  { score: 4, label: "Excellent", bg: "#e6f5eb", border: "#bfe5cd", badge: "#38a169", text: "#1f7a43" },
  { score: 3, label: "Good", bg: "#edf8e5", border: "#d1edc2", badge: "#79c74b", text: "#4e8a30" },
  { score: 2, label: "Fair", bg: "#fff5df", border: "#f3ddab", badge: "#e8a51f", text: "#a26d0c" },
  { score: 1, label: "Poor", bg: "#fde8e7", border: "#f5c6c3", badge: "#ed4139", text: "#b52b25" },
];

const KPIS = [
  { abbr: "CLS", label: "Closure" },
  { abbr: "FIT", label: "Fit" },
  { abbr: "CGR", label: "Congestion" },
  { abbr: "HKR", label: "Hyperkeratosis" },
  { abbr: "SPD", label: "Milking Speed" },
  { abbr: "RSP", label: "Response" },
  { abbr: "FLD", label: "Fold-back" },
  { abbr: "SLP", label: "Liner Slip" },
  { abbr: "RNG", label: "Ring / Crawl" },
];

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="800"
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="#6f7c8f"
    >
      {children}
    </Text>
  );
}

function ScorePill({ item }) {
  return (
    <HStack
      spacing={3}
      h="42px"
      px={2}
      pr={4}
      borderWidth="1px"
      borderColor={item.border}
      borderRadius="10px"
      bg={item.bg}
      minW={{ base: "132px", sm: "108px" }}
    >
      <Flex
        align="center"
        justify="center"
        w="28px"
        h="28px"
        flexShrink={0}
        borderRadius="7px"
        bg={item.badge}
        color="white"
        fontWeight="800"
        fontSize="md"
        lineHeight="1"
      >
        {item.score}
      </Flex>
      <Text fontSize="sm" fontWeight="800" color={item.text} whiteSpace="nowrap">
        {item.label}
      </Text>
    </HStack>
  );
}

function KpiItem({ abbr, label }) {
  return (
    <HStack spacing={3} minW={0}>
      <Flex
        align="center"
        justify="center"
        minW="36px"
        h="20px"
        px={2}
        borderRadius="6px"
        bg="#dbeafe"
        color="#2f67bf"
        fontSize="xs"
        fontWeight="800"
        lineHeight="1"
      >
        {abbr}
      </Flex>
      <Text color="#344054" fontSize="sm" fontWeight="700" lineHeight="1.2">
        {label}
      </Text>
    </HStack>
  );
}

export default function InformationPage() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="#f4f5f2">
      <AppHeader title="Informazioni" subtitle="Guida alla pagina risultati prodotto" backHref="/home" />
      <Box
        as="main"
        flex="1"
        w="100%"
        bg="white"
        borderLeftWidth={{ base: 0, md: "1px" }}
        borderLeftColor="#d9d9d2"
      >
        <Box
          maxW="6xl"
          mx="auto"
          px={{ base: 5, md: 7 }}
          pt={{ base: 7, md: 8 }}
          pb={{ base: 12, md: 20 }}
        >
          <VStack align="stretch" spacing={6} maxW="900px">
            <Box>
              <SectionLabel>Legend</SectionLabel>
              <Heading
                as="h1"
                mt={2}
                fontSize={{ base: "2xl", md: "20px" }}
                lineHeight="1.2"
                color="#253044"
                letterSpacing="0"
              >
                Reading the scores
              </Heading>
              <Text mt={2} color="#7a8797" fontSize="sm" fontWeight="600">
                Every liner is rated 1-4 on nine performance tests. Shared across all layouts below.
              </Text>
            </Box>

            <Box>
              <SectionLabel>Score Scale</SectionLabel>
              <Flex mt={3} gap={2} flexWrap="wrap">
                {SCORE_SCALE.map((item) => (
                  <ScorePill key={item.score} item={item} />
                ))}
              </Flex>
            </Box>

            <Box>
              <SectionLabel>The 9 KPIs</SectionLabel>
              <SimpleGrid
                mt={3}
                columns={{ base: 1, sm: 2, md: 3 }}
                columnGap={{ base: 6, md: 24 }}
                rowGap={3}
              >
                {KPIS.map((kpi) => (
                  <KpiItem key={kpi.abbr} {...kpi} />
                ))}
              </SimpleGrid>
            </Box>

            <Text color="#9aa5b2" fontSize="xs" fontStyle="italic" fontWeight="600">
              KPI full names are placeholders - confirm the real wording and I'll update.
            </Text>
          </VStack>
        </Box>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
