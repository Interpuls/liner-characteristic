import { useEffect, useState } from "react";
import { Box, Heading, HStack, SimpleGrid, Spinner, Text } from "@chakra-ui/react";
import { getOverviewRankings } from "../../lib/api";

function SectionRow({ title, kpis = [] }) {
  return (
    <Box>
      <Heading size="sm" color="gray.400" mb={2}>
        Teat size: {title}
      </Heading>
      <HStack spacing={4} overflowX="auto" py={2} px={1}>
        {kpis.map((kpi) => (
          <Box
            key={kpi.kpi_code}
            minW="220px"
            p={4}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.100"
            rounded="lg"
          >
            <Text fontWeight="semibold" color="white">
              {kpi.kpi_code}
            </Text>
            {(kpi.top || []).slice(0, 3).map((item) => (
              <Text
                key={`${kpi.kpi_code}-${item.rank}-${item.brand}-${item.model}`}
                fontSize="sm"
                color="whiteAlpha.900"
                mt={1}
              >
                {item.rank}. {item.brand} {item.model}
              </Text>
            ))}
            {(!kpi.top || kpi.top.length === 0) && (
              <Text fontSize="sm" color="whiteAlpha.700" mt={1}>
                No data
              </Text>
            )}
          </Box>
        ))}
      </HStack>
    </Box>
  );
}

export default function RankingsSection({ token }) {
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
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
