import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { Box, Heading, HStack, SimpleGrid, Spinner, Text, VStack, Badge } from "@chakra-ui/react";
import { FiAward } from "react-icons/fi";
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
      bg="whiteAlpha.50"
      borderRadius="md"
      transition="all 0.15s ease"
      _hover={{ bg: "whiteAlpha.100", borderColor: "blue.200" }}
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

function SectionRow({ title, kpis = [], fromPath }) {
  return (
    <Box>
      <Heading size="sm" color="gray.300" mb={2}>
        Teat size: {title}
      </Heading>
      <HStack spacing={4} overflowX="auto" py={2} px={1} align="stretch">
        {kpis.map((kpi) => (
          <Box
            key={kpi.kpi_code}
            minW={{ base: "250px", md: "280px" }}
            p={0}
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            bgGradient="linear(165deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))"
            rounded="xl"
            overflow="hidden"
            transition="all 0.2s ease"
            _hover={{
              transform: "translateY(-2px)",
              borderColor: "blue.200",
              bgGradient: "linear(165deg, rgba(255,255,255,0.18), rgba(255,255,255,0.09))",
            }}
          >
            <HStack
              justify="space-between"
              align="center"
              px={4}
              py={3}
              borderBottomWidth="1px"
              borderBottomColor="whiteAlpha.200"
              bg="whiteAlpha.80"
            >
              <HStack spacing={2}>
                <Box as={FiAward} color="whiteAlpha.900" />
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
                  teatSize={title}
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

  return (
    <>
      <Heading size="md" color="gray.300" mb={4} mt={0}>
        Performance Rankings
      </Heading>
      {loading && (
        <HStack spacing={3} color="gray.300" py={4}>
          <Spinner size="sm" />
          <Text>Loading rankings...</Text>
        </HStack>
      )}
      {!loading && error && (
        <Text color="red.300" py={2}>
          {error}
        </Text>
      )}
      {!loading && !error && (
        <SimpleGrid columns={{ base: 1 }} gap={6}>
          {rankings.map((item) => (
            <SectionRow
              key={`${item.teat_size}-${item.size_mm}`}
              title={item.teat_size}
              kpis={item.kpis || []}
              fromPath={router.asPath || "/"}
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
