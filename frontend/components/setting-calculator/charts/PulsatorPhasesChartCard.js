import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Card,
  CardBody,
  Heading,
  HStack,
  Icon,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { FiLayers } from "react-icons/fi";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

const Bar = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PHASE_ORDER = ["A", "B", "C", "D"];
const PHASE_COLORS = {
  A: "rgba(26, 54, 93, 0.96)", // blue.900
  B: "rgba(43, 108, 176, 0.94)", // blue.700
  C: "rgba(49, 130, 206, 0.92)", // blue.500
  D: "rgba(79, 209, 197, 0.9)", // teal.300
};

function normalizeSegments(segments) {
  const byKey = new Map();
  for (const seg of segments || []) {
    const key = String(seg?.key || "").toUpperCase();
    if (!PHASE_ORDER.includes(key)) continue;
    byKey.set(key, Number(seg?.valueMs || 0));
  }
  return PHASE_ORDER.map((key) => ({ key, valueMs: byKey.get(key) || 0 }));
}

function totalMs(segments) {
  return segments.reduce((acc, seg) => acc + Number(seg.valueMs || 0), 0);
}

function formatMs(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? String(Math.round(n)) : "0";
}

function getStackRadius(datasetIndex, totalDatasets, isMobile) {
  const first = datasetIndex === 0;
  const last = datasetIndex === totalDatasets - 1;
  if (isMobile) {
    return {
      topLeft: last ? 10 : 0,
      topRight: last ? 10 : 0,
      bottomLeft: first ? 10 : 0,
      bottomRight: first ? 10 : 0,
    };
  }
  return {
    topLeft: first ? 10 : 0,
    bottomLeft: first ? 10 : 0,
    topRight: last ? 10 : 0,
    bottomRight: last ? 10 : 0,
  };
}

const phaseValueLabelsPlugin = {
  id: "phaseValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((barElement, index) => {
        const raw = Array.isArray(dataset.data) ? dataset.data[index] : 0;
        const value = Number(raw || 0);
        if (value <= 0) return;

        const isHorizontal = chart.options?.indexAxis === "y";
        const size = isHorizontal
          ? Math.abs(barElement.base - barElement.x)
          : Math.abs(barElement.base - barElement.y);
        const minLabelSize = isHorizontal ? 28 : 18;
        if (size < minLabelSize) return;

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const x = isHorizontal ? (barElement.base + barElement.x) / 2 : barElement.x;
        const y = isHorizontal ? barElement.y : (barElement.base + barElement.y) / 2;
        ctx.shadowColor = "rgba(15, 23, 42, 0.55)";
        ctx.shadowBlur = 2;
        ctx.fillText(formatMs(value), x, y);
        ctx.restore();
      });
    });
  },
};

export default function PulsatorPhasesChartCard({ runData }) {
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const leftRaw = runData?.response?.left?.charts?.pulsatorPhases?.segments;
  const rightRaw = runData?.response?.right?.charts?.pulsatorPhases?.segments;

  const data = useMemo(() => {
    const leftSegments = normalizeSegments(leftRaw);
    const rightSegments = normalizeSegments(rightRaw);
    if (!leftSegments.length || !rightSegments.length) return null;
    const leftTotal = totalMs(leftSegments);
    const rightTotal = totalMs(rightSegments);
    const axisMax = Math.max(leftTotal, rightTotal, 1);
    return { leftSegments, rightSegments, axisMax };
  }, [leftRaw, rightRaw]);

  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";

  const chartData = useMemo(() => {
    if (!data) return null;
    const byPhase = Object.fromEntries(PHASE_ORDER.map((phase) => [phase, [0, 0]]));
    data.leftSegments.forEach((seg) => {
      byPhase[seg.key][0] = Number(seg.valueMs || 0);
    });
    data.rightSegments.forEach((seg) => {
      byPhase[seg.key][1] = Number(seg.valueMs || 0);
    });

    return {
      labels: [leftLabel, rightLabel],
      datasets: PHASE_ORDER.map((phase, phaseIdx) => ({
        label: phase,
        data: byPhase[phase],
        backgroundColor: PHASE_COLORS[phase],
        borderColor: "transparent",
        borderWidth: 0,
        borderRadius: getStackRadius(phaseIdx, PHASE_ORDER.length, isMobile),
        borderSkipped: false,
        barThickness: 26,
      })),
    };
  }, [data, leftLabel, rightLabel, isMobile]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isMobile ? "x" : "y",
      interaction: {
        mode: "nearest",
        axis: isMobile ? "x" : "y",
        intersect: false,
      },
      animation: {
        duration: 650,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            color: "#475569",
            usePointStyle: true,
            pointStyle: "rectRounded",
            boxWidth: 10,
            boxHeight: 10,
            padding: 24,
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
          displayColors: true,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatMs(context.raw)} ms`;
            },
            footer(items) {
              const total = items.reduce((acc, item) => acc + Number(item.raw || 0), 0);
              return `Total: ${formatMs(total)} ms`;
            },
          },
        },
      },
      scales: {
        x: isMobile
          ? {
              stacked: true,
              grid: { display: false, drawBorder: false },
              ticks: {
                color: "#475569",
                autoSkip: false,
                maxRotation: 0,
                font: { size: 11, weight: "600" },
              },
            }
          : {
              stacked: true,
              min: 0,
              suggestedMax: data?.axisMax || 1,
              grid: { color: "#e2e8f0", drawBorder: false },
              ticks: {
                color: "#64748b",
                maxTicksLimit: 6,
                callback(value) {
                  return `${value} ms`;
                },
              },
            },
        y: isMobile
          ? {
              stacked: true,
              min: 0,
              suggestedMax: data?.axisMax || 1,
              grid: { color: "#e2e8f0", drawBorder: false },
              ticks: {
                color: "#64748b",
                maxTicksLimit: 4,
                callback(value) {
                  return `${value} ms`;
                },
              },
            }
          : {
              stacked: true,
              grid: { display: false, drawBorder: false },
              ticks: {
                color: "#334155",
                font: { size: 12, weight: "600" },
              },
            },
      },
    }),
    [data, isMobile]
  );

  if (!data || !chartData) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>Pulsator phase data is not available for this comparison.</AlertDescription>
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
              <Icon as={FiLayers} color="blue.500" boxSize={5} />
              <Heading size="md">Pulsator Phases</Heading>
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
                <Icon as={FiLayers} color="blue.500" boxSize={5} />
                <Heading size="md">Pulsator Phases</Heading>
              </HStack>
            ) : null}
            <Text fontSize="xs" color="gray.500" mb={4}>
              A-D segments in ms for each liner.
            </Text>
            <Box h={{ base: "360px", md: "260px" }}>
              <Bar data={chartData} options={chartOptions} plugins={[phaseValueLabelsPlugin]} aria-label="Pulsator phases stacked chart" />
            </Box>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}
