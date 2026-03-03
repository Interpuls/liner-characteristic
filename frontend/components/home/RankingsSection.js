import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { Box, Heading, HStack, Spinner, Text, VStack, Badge, Select, Center } from "@chakra-ui/react";
import { FiAward, FiBarChart2 } from "react-icons/fi";
import { getOverviewRankings } from "../../lib/api";

function RankBadge({ rank }) {
  const common = { borderRadius: "full", px: 2, minW: "34px", textAlign: "center", flexShrink: 0 };
  if (rank === 1) return <Badge colorScheme="yellow" {...common}>#1</Badge>;
  if (rank === 2) return <Badge colorScheme="blue" {...common}>#2</Badge>;
  if (rank === 3) return <Badge colorScheme="teal" {...common}>#3</Badge>;
  return <Badge colorScheme="gray" {...common}>#{rank}</Badge>;
}

function RankingRow({ item, teatSize, fromPath }) {
  const modelLabel = (item?.model || "-").trim();
  const brandLabel = (item?.brand || "-").trim();
  const params = new URLSearchParams({
    brand: item?.brand || "",
    model: item?.model || "",
    teat_size: teatSize || "",
    from: fromPath || "/",
  });
  const href = `/idcard/idresult?${params.toString()}`;

  return (
    <Box
      as={NextLink}
      href={href}
      display="flex"
      alignItems="center"
      w="full"
      px={3}
      py={2}
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="rgba(17, 30, 66, 0.85)"
      borderRadius="md"
      transition="all 0.15s ease"
      _hover={{ bg: "rgba(24, 42, 90, 0.95)", borderColor: "blue.200" }}
    >
      <HStack spacing={2} minW={0} w="full" align="center">
        <RankBadge rank={item.rank} />
        <VStack align="start" spacing={0} minW={0} flex="1">
          <Text fontSize="sm" color="white" fontWeight="semibold" noOfLines={1} w="full" textAlign="left">
            {modelLabel}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.700" noOfLines={1} w="full" textAlign="left">
            {brandLabel}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}

function RankingsCarousel({ teatSize, kpis = [], fromPath }) {
  return (
    <Box>
      <HStack spacing={4} overflowX="auto" py={2} px={1} align="stretch">
        {kpis.map((kpi) => (
          <Box
            key={kpi.kpi_code}
            minW={{ base: "250px", md: "280px" }}
            p={0}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="rgba(12, 22, 48, 0.9)"
            rounded="xl"
            overflow="hidden"
            transition="all 0.2s ease"
            _hover={{
              transform: "translateY(-2px)",
              borderColor: "blue.200",
              bg: "rgba(17, 30, 66, 0.95)",
            }}
          >
            <HStack
              justify="space-between"
              align="center"
              px={4}
              py={3}
              borderBottomWidth="1px"
              borderBottomColor="whiteAlpha.200"
              bg="rgba(10, 20, 44, 0.85)"
            >
              <HStack spacing={2}>
                <Box as={FiAward} color="blue.200" />
                <Text fontWeight="bold" color="white" fontSize="sm">
                  {kpi.kpi_code}
                </Text>
              </HStack>
            </HStack>

            <VStack align="stretch" spacing={2} px={3} py={3}>
              {(kpi.top || []).slice(0, 3).map((item) => (
                <RankingRow
                  key={`${kpi.kpi_code}-${item.rank}-${item.brand}-${item.model}`}
                  item={item}
                  teatSize={teatSize}
                  fromPath={fromPath}
                />
              ))}
              {(!kpi.top || kpi.top.length === 0) && (
                <Text fontSize="sm" color="whiteAlpha.700" px={1}>
                  No data
                </Text>
              )}
            </VStack>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}

export default function RankingsSection({ token }) {
  const router = useRouter();
  const [rankings, setRankings] = useState([]);
  const [selectedTeatSize, setSelectedTeatSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getOverviewRankings(token, { limit: 3 })
      .then((res) => {
        if (cancelled) return;
        setRankings(Array.isArray(res?.items) ? res.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setRankings([]);
        setError("Unable to load rankings");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const teatSizes = rankings.map((item) => item?.teat_size).filter(Boolean);
  const activeTeatSize = selectedTeatSize && teatSizes.includes(selectedTeatSize)
    ? selectedTeatSize
    : teatSizes[0] || "";
  const activeRanking = rankings.find((item) => item?.teat_size === activeTeatSize) || null;

  useEffect(() => {
    if (!teatSizes.length) {
      setSelectedTeatSize("");
      return;
    }
    if (!selectedTeatSize || !teatSizes.includes(selectedTeatSize)) {
      setSelectedTeatSize(teatSizes[0]);
    }
  }, [selectedTeatSize, teatSizes]);

  return (
    <Box
      mb={8}
      p={{ base: 4, md: 5 }}
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="rgba(16, 26, 54, 0.85)"
      borderRadius="xl"
    >
      <HStack spacing={3} mb={4} mt={0} align="center">
        <Box as={FiBarChart2} color="blue.200" boxSize={{ base: 9, md: 10 }} />
        <Heading size="lg" color="gray.300">Performance Rankings</Heading>
      </HStack>

      {!loading && !error && teatSizes.length > 0 && (
        <HStack spacing={3} mb={3} align="center">
          <Text fontSize="sm" color="gray.300" fontWeight="semibold">
            Teat Size
          </Text>
          <Select
            size="sm"
            value={activeTeatSize}
            onChange={(e) => setSelectedTeatSize(e.target.value)}
            maxW={{ base: "140px", md: "180px" }}
            bg="rgba(10, 20, 44, 0.85)"
            borderColor="whiteAlpha.300"
            color="white"
            _hover={{ borderColor: "blue.300" }}
            _focus={{ borderColor: "blue.300", boxShadow: "0 0 0 1px rgba(99, 179, 237, 0.8)" }}
            sx={{
              option: {
                color: "#12305f",
                background: "#ffffff",
              },
            }}
          >
            {teatSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </HStack>
      )}

      {loading && (
        <Center py={6}>
          <Spinner size="md" color="blue.300" />
        </Center>
      )}
      {!loading && error && (
        <Text color="red.300" py={2}>
          {error}
        </Text>
      )}
      {!loading && !error && activeRanking && (
        <RankingsCarousel
          teatSize={activeTeatSize}
          kpis={activeRanking.kpis || []}
          fromPath={router.asPath || "/"}
        />
      )}
      {!loading && !error && !activeRanking && (
        <Text color="gray.400">No rankings available.</Text>
      )}
    </Box>
  );
}
