import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Card,
  CardBody,
  HStack,
  Heading,
  Icon,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { FiActivity } from "react-icons/fi";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), { ssr: false });

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Legend);

const KPA_PER_INHG = 3.386389;

function kpaToInhg(kpa) {
  return Number(kpa || 0) / KPA_PER_INHG;
}

function toDisplayPressure(kpaValue, unitSystem) {
  return unitSystem === "imperial" ? kpaToInhg(kpaValue) : Number(kpaValue || 0);
}

function toLineData(points, unitSystem) {
  if (!Array.isArray(points)) return [];
  return points.map((p) => ({
    x: Number(p?.xMs || 0),
    y: toDisplayPressure(p?.yKpa, unitSystem),
  }));
}

export default function PulsationChartCard({ runData, unitSystem = "metric" }) {
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const leftCurve = runData?.response?.left?.charts?.pulsation?.curve;
  const leftThreshold = runData?.response?.left?.charts?.pulsation?.threshold;
  const rightCurve = runData?.response?.right?.charts?.pulsation?.curve;
  const rightThreshold = runData?.response?.right?.charts?.pulsation?.threshold;

  const pressureUnitLabel = unitSystem === "imperial" ? "inHg" : "kPa";
  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";

  const chartData = useMemo(() => {
    const leftLine = toLineData(leftCurve?.points, unitSystem);
    const rightLine = toLineData(rightCurve?.points, unitSystem);
    const leftThr = toLineData(leftThreshold?.points, unitSystem);
    const rightThr = toLineData(rightThreshold?.points, unitSystem);

    const hasAnyData = leftLine.length || rightLine.length || leftThr.length || rightThr.length;
    if (!hasAnyData) return null;

    return {
      datasets: [
        {
          label: leftLabel,
          data: leftLine,
          parsing: false,
          borderColor: "rgba(43, 108, 176, 1)", // blue.700
          backgroundColor: "rgba(43, 108, 176, 1)",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0,
        },
        {
          label: rightLabel,
          data: rightLine,
          parsing: false,
          borderColor: "rgba(79, 209, 197, 1)", // teal.300
          backgroundColor: "rgba(79, 209, 197, 1)",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0,
        },
        {
          label: `${leftLabel} threshold`,
          data: leftThr,
          parsing: false,
          borderColor: "rgba(66, 153, 225, 0.9)", // blue.400
          backgroundColor: "rgba(66, 153, 225, 0.9)",
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: `${rightLabel} threshold`,
          data: rightThr,
          parsing: false,
          borderColor: "rgba(56, 178, 172, 0.9)", // teal.400
          backgroundColor: "rgba(56, 178, 172, 0.9)",
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          tension: 0,
        },
      ],
    };
  }, [leftCurve, rightCurve, leftThreshold, rightThreshold, leftLabel, rightLabel, unitSystem]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            color: "#475569",
            usePointStyle: true,
            pointStyle: "line",
            boxWidth: 24,
            boxHeight: 8,
            padding: 22,
            font: {
              size: 12,
              weight: "600",
            },
          },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          borderColor: "#334155",
          borderWidth: 1,
          callbacks: {
            title(items) {
              if (!items?.length) return "";
              return `Time: ${Math.round(Number(items[0].parsed.x || 0))} ms`;
            },
            label(context) {
              const y = Number(context.parsed?.y || 0);
              return `${context.dataset.label}: ${y.toFixed(1)} ${pressureUnitLabel}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          grid: {
            color: "#e2e8f0",
            drawBorder: false,
          },
          ticks: {
            color: "#64748b",
            maxTicksLimit: isMobile ? 4 : 6,
            callback(value) {
              return `${value} ms`;
            },
          },
          title: {
            display: true,
            text: "Time (ms)",
            color: "#475569",
            font: {
              size: 12,
              weight: "600",
            },
          },
        },
        y: {
          min: 0,
          grid: {
            color: "#e2e8f0",
            drawBorder: false,
          },
          ticks: {
            color: "#64748b",
            maxTicksLimit: isMobile ? 4 : 6,
          },
          title: {
            display: true,
            text: `Vacuum (${pressureUnitLabel})`,
            color: "#475569",
            font: {
              size: 12,
              weight: "600",
            },
          },
        },
      },
      elements: {
        line: {
          capBezierPoints: false,
        },
      },
    }),
    [isMobile, pressureUnitLabel]
  );

  if (!chartData) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>Pulsation data is not available for this comparison.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card
      bg={{ base: "transparent", md: "white" }}
      boxShadow={{ base: "none", md: "sm" }}
      borderWidth={{ base: "0", md: "1px" }}
      borderColor={{ base: "transparent", md: "gray.200" }}
    >
      <CardBody p={{ base: 0, md: 6 }}>
        <VStack align="stretch" spacing={4}>
          {!isMobile ? (
            <HStack spacing={2} align="center">
              <Icon as={FiActivity} color="blue.500" boxSize={5} />
              <Heading size="md">Pulsation Chart</Heading>
            </HStack>
          ) : null}

          <Box
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            bgGradient="linear(to-b, white, gray.50)"
            p={{ base: 3, md: 4 }}
            boxShadow="sm"
          >
            {isMobile ? (
              <HStack spacing={2} align="center" mb={2}>
                <Icon as={FiActivity} color="blue.500" boxSize={5} />
                <Heading size="md">Pulsation Chart</Heading>
              </HStack>
            ) : null}
            <Text fontSize="xs" color="gray.500" mb={4}>
              Pulsation curves and real threshold for both liners.
            </Text>
            <Box w="100%" overflowX={{ base: "auto", md: "visible" }}>
              <Box minW={{ base: "760px", md: "100%" }} h={{ base: "360px", md: "460px" }}>
                <Line data={chartData} options={chartOptions} aria-label="Pulsation chart with thresholds" />
              </Box>
            </Box>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}
