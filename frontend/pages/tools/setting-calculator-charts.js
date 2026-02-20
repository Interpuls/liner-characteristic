import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
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
import { getToken } from "../../lib/auth";
import { getMe } from "../../lib/api";

const KPA_PER_INHG = 3.386389;

function kpaToInhg(kpa) {
  return Number(kpa || 0) / KPA_PER_INHG;
}

function toDisplayPressure(kpaValue, unitSystem) {
  return unitSystem === "imperial" ? kpaToInhg(kpaValue) : Number(kpaValue || 0);
}

function polylinePoints(points, maxX, maxY, width, height, pad, unitSystem) {
  if (!Array.isArray(points) || !points.length) return "";
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return points
    .map((p) => {
      const xRatio = maxX > 0 ? p.xMs / maxX : 0;
      const yValue = toDisplayPressure(p.yKpa, unitSystem);
      const yRatio = maxY > 0 ? yValue / maxY : 0;
      const x = pad + xRatio * innerW;
      const y = height - pad - yRatio * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

function PulsationChartCard({ runData, unitSystem = "metric" }) {
  const leftCurve = runData?.response?.left?.charts?.pulsation?.curve;
  const leftThreshold = runData?.response?.left?.charts?.pulsation?.threshold;
  const rightCurve = runData?.response?.right?.charts?.pulsation?.curve;
  const rightThreshold = runData?.response?.right?.charts?.pulsation?.threshold;

  const chartData = useMemo(() => {
    const leftPts = leftCurve?.points || [];
    const rightPts = rightCurve?.points || [];
    const all = [...leftPts, ...rightPts];
    if (!all.length) return null;

    const maxX = Math.max(...all.map((p) => Number(p?.xMs || 0)), 1);
    const maxY = Math.max(...all.map((p) => toDisplayPressure(p?.yKpa, unitSystem)), 1);
    return { maxX, maxY };
  }, [leftCurve, rightCurve, unitSystem]);

  if (!chartData) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>Dati pulsation non disponibili per il confronto corrente.</AlertDescription>
      </Alert>
    );
  }

  const width = 920;
  const height = 360;
  const pad = 44;

  const leftLine = polylinePoints(leftCurve?.points || [], chartData.maxX, chartData.maxY, width, height, pad, unitSystem);
  const rightLine = polylinePoints(rightCurve?.points || [], chartData.maxX, chartData.maxY, width, height, pad, unitSystem);
  const leftThr = polylinePoints(leftThreshold?.points || [], chartData.maxX, chartData.maxY, width, height, pad, unitSystem);
  const rightThr = polylinePoints(rightThreshold?.points || [], chartData.maxX, chartData.maxY, width, height, pad, unitSystem);
  const pressureUnitLabel = unitSystem === "imperial" ? "inHg" : "kPa";

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <Heading size="sm">Pulsation Chart</Heading>
          <HStack spacing={4} fontSize="xs" color="gray.600" flexWrap="wrap">
            <HStack spacing={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="blue.500" />
              <Text>{runData?.leftProduct?.label || "Left"}</Text>
            </HStack>
            <HStack spacing={1}>
              <Box w="10px" h="10px" borderRadius="full" bg="green.500" />
              <Text>{runData?.rightProduct?.label || "Right"}</Text>
            </HStack>
            <HStack spacing={1}>
              <Box w="14px" h="2px" bg="blue.400" />
              <Text>Left threshold</Text>
            </HStack>
            <HStack spacing={1}>
              <Box w="14px" h="2px" bg="green.400" />
              <Text>Right threshold</Text>
            </HStack>
          </HStack>

          <Box w="100%" overflowX="auto">
            <Box minW="760px">
              <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pulsation trapezoid chart">
                <rect x="0" y="0" width={width} height={height} fill="white" />

                <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#94a3b8" strokeWidth="1" />
                <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#94a3b8" strokeWidth="1" />

                <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
                <line x1={width / 2} y1={pad} x2={width / 2} y2={height - pad} stroke="#e2e8f0" strokeDasharray="4 4" />

                {leftThr ? (
                  <polyline
                    points={leftThr}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                ) : null}
                {rightThr ? (
                  <polyline
                    points={rightThr}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                ) : null}

                {leftLine ? (
                  <polyline
                    points={leftLine}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {rightLine ? (
                  <polyline
                    points={rightLine}
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}

                <text x={pad} y={pad - 10} fill="#475569" fontSize="12">{pressureUnitLabel}</text>
                <text x={width - pad - 10} y={height - pad + 22} fill="#475569" fontSize="12">ms</text>
              </svg>
            </Box>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}

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
        subtitle="Risultati confronto impostazioni"
        backHref={backHref}
      />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }}>
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
            </>
          )}

          <HStack justify="flex-end">
            <Button variant="outline" onClick={() => router.push("/tools/setting-calculator")}>
              Torna agli Input
            </Button>
          </HStack>
        </VStack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
