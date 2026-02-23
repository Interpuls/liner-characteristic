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
import { FiClock } from "react-icons/fi";
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

const BAR_KEYS = {
  MILKING: "Real Milking",
  OFF: "Real OFF",
};

const BAR_COLORS = {
  [BAR_KEYS.MILKING]: "rgba(43, 108, 176, 0.95)", // blue.700
  [BAR_KEYS.OFF]: "rgba(79, 209, 197, 0.92)", // teal.300
};

function formatMs(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function getBarValue(bars, expectedKey) {
  const found = (bars || []).find((bar) => String(bar?.key || "").toLowerCase() === expectedKey.toLowerCase());
  return Number(found?.valueMs || 0);
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

const milkingValueLabelsPlugin = {
  id: "milkingValueLabels",
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
        if (size < 28) return;

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const x = isHorizontal ? (barElement.base + barElement.x) / 2 : barElement.x;
        const y = isHorizontal ? barElement.y : (barElement.base + barElement.y) / 2;
        ctx.shadowColor = "rgba(15, 23, 42, 0.55)";
        ctx.shadowBlur = 2;
        ctx.fillText(String(formatMs(value)), x, y);
        ctx.restore();
      });
    });
  },
};

export default function RealMilkingMassageChartCard({ runData }) {
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const leftBarsRaw = runData?.response?.left?.charts?.realMilkingMassage?.bars;
  const rightBarsRaw = runData?.response?.right?.charts?.realMilkingMassage?.bars;

  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";

  const chartData = useMemo(() => {
    const leftBars = Array.isArray(leftBarsRaw) ? leftBarsRaw : [];
    const rightBars = Array.isArray(rightBarsRaw) ? rightBarsRaw : [];

    const leftMilking = getBarValue(leftBars, BAR_KEYS.MILKING);
    const leftOff = getBarValue(leftBars, BAR_KEYS.OFF);
    const rightMilking = getBarValue(rightBars, BAR_KEYS.MILKING);
    const rightOff = getBarValue(rightBars, BAR_KEYS.OFF);

    const hasData = leftMilking > 0 || leftOff > 0 || rightMilking > 0 || rightOff > 0;
    if (!hasData) return null;

    return {
      labels: [leftLabel, rightLabel],
      datasets: [
        {
          label: BAR_KEYS.MILKING,
          data: [leftMilking, rightMilking],
          backgroundColor: BAR_COLORS[BAR_KEYS.MILKING],
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: getStackRadius(0, 2, isMobile),
          borderSkipped: false,
          barThickness: 28,
        },
        {
          label: BAR_KEYS.OFF,
          data: [leftOff, rightOff],
          backgroundColor: BAR_COLORS[BAR_KEYS.OFF],
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: getStackRadius(1, 2, isMobile),
          borderSkipped: false,
          barThickness: 28,
        },
      ],
    };
  }, [leftBarsRaw, rightBarsRaw, leftLabel, rightLabel, isMobile]);

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
    [isMobile]
  );

  if (!chartData) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>Real milking massage data is not available for this comparison.</AlertDescription>
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
              <Icon as={FiClock} color="teal.500" boxSize={5} />
              <Heading size="md">Real Milking / Real OFF</Heading>
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
                <Icon as={FiClock} color="teal.500" boxSize={5} />
                <Heading size="md">Real Milking / Real OFF</Heading>
              </HStack>
            ) : null}
            <Text fontSize="xs" color="gray.500" mb={4}>
              Real duration in ms during the cycle.
            </Text>
            <Box h={{ base: "320px", md: "240px" }}>
              <Bar
                data={chartData}
                options={chartOptions}
                plugins={[milkingValueLabelsPlugin]}
                aria-label="Real milking and off stacked chart"
              />
            </Box>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}
