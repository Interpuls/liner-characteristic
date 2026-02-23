import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import PulsationChartCard from "../../components/setting-calculator/charts/PulsationChartCard";
import PulsatorPhasesChartCard from "../../components/setting-calculator/charts/PulsatorPhasesChartCard";
import RealMilkingMassageChartCard from "../../components/setting-calculator/charts/RealMilkingMassageChartCard";
import { getToken } from "../../lib/auth";
import { getMe } from "../../lib/api";

export default function SettingCalculatorChartsPage() {
  const router = useRouter();
  const { requestId, from } = router.query;
  const backHref = typeof from === "string" && from ? decodeURIComponent(from) : "/tools/setting-calculator";
  const [runData, setRunData] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("settingCalculator:lastRun");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (requestId && parsed?.payload?.requestId !== requestId) return;
      setRunData(parsed);
    } catch {
      setRunData(null);
    }
  }, [requestId]);

  useEffect(() => {
    const loadUnitSystem = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const me = await getMe(token);
        setUnitSystem(me?.unit_system === "imperial" ? "imperial" : "metric");
      } catch {
        setUnitSystem("metric");
      }
    };
    loadUnitSystem();
  }, []);

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Setting Calculator Charts"
        subtitle="Comparison results"
        backHref={backHref}
      />

      <Box
        as="main"
        flex="1"
        w="100%"
        maxW={{ base: "100%", md: "7xl" }}
        mx="auto"
        px={{ base: 4, md: 8 }}
        pt={{ base: 4, md: 6 }}
      >
        <VStack align="stretch" spacing={4}>
          {!runData ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                No result available in this session. Please run the comparison from the Setting Calculator page first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <Heading size="sm">Comparison executed</Heading>
                    <Text fontSize="sm" color="gray.700">
                      {runData.leftProduct?.label} vs {runData.rightProduct?.label}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Request ID: {runData.payload?.requestId}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Engine: {runData.response?.engineVersion}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <PulsationChartCard runData={runData} unitSystem={unitSystem} />
              <PulsatorPhasesChartCard runData={runData} />
              <RealMilkingMassageChartCard runData={runData} />
            </>
          )}

          <HStack justify="flex-end">
            <Button variant="outline" onClick={() => router.push("/tools/setting-calculator")}>
              Back to Inputs
            </Button>
          </HStack>
        </VStack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
