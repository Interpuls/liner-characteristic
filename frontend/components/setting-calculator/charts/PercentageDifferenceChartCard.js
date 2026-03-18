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

const valueLabelsPlugin = {
  id: "valueLabelsPct",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((barElement, index) => {
        const raw = Array.isArray(dataset.data) ? dataset.data[index] : 0;
        const value = Number(raw || 0);
        if (!Number.isFinite(value)) return;

        const isHorizontal = chart.options?.indexAxis === "y";
        const size = isHorizontal
          ? Math.abs(barElement.base - barElement.x)
          : Math.abs(barElement.base - barElement.y);
        if (size < 24) return;

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const x = isHorizontal ? (barElement.base + barElement.x) / 2 : barElement.x;
        const y = isHorizontal ? barElement.y : (barElement.base + barElement.y) / 2;
        ctx.shadowColor = "rgba(15, 23, 42, 0.55)";
        ctx.shadowBlur = 2;
        ctx.fillText(`${value.toFixed(1)}%`, x, y);
        ctx.restore();
      });
    });
  },
};

function formatPct(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function pickNiceStep(range) {
  if (!Number.isFinite(range) || range <= 0) return 5;
  const rough = range / 5;
  const candidates = [1, 2, 5, 10, 20, 25, 50];
  return candidates.find((s) => s >= rough) || Math.ceil(rough / 10) * 10;
}

export default function PercentageDifferenceChartCard({
  runData,
  dataKey,
  title,
  subtitle,
  icon,
}) {
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const diffPct = runData?.response?.diffPct?.[dataKey];

  const chartData = useMemo(() => {
    const pf = Number(diffPct?.pf);
    const om = Number(diffPct?.om);
    if (!Number.isFinite(pf) || !Number.isFinite(om)) return null;

    return {
      labels: ["PF", "OM"],
      datasets: [
        {
          label: "Difference (%)",
          data: [pf, om],
          backgroundColor: [
            "rgba(43, 108, 176, 0.95)", // blue.700
            "rgba(79, 209, 197, 0.92)", // teal.300
          ],
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: 10,
          borderSkipped: false,
          barThickness: isMobile ? 36 : 44,
        },
      ],
    };
  }, [diffPct, isMobile]);

  const chartOptions = useMemo(() => {
    if (!chartData) return null;
    const values = chartData.datasets[0].data.map((v) => Number(v || 0));
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const pad = Math.max(5, Math.abs(maxVal - minVal) * 0.18);
    const rawMin = minVal - pad;
    const rawMax = maxVal + pad;
    const stepSize = pickNiceStep(rawMax - rawMin);
    const niceMin = Math.floor(rawMin / stepSize) * stepSize;
    const niceMax = Math.ceil(rawMax / stepSize) * stepSize;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          borderColor: "#334155",
          borderWidth: 1,
          callbacks: {
            label(context) {
              return `${context.label}: ${formatPct(context.raw)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: "#334155",
            font: { size: 12, weight: "600" },
          },
        },
        y: {
          min: niceMin,
          max: niceMax,
          grid: {
            color: "#e2e8f0",
            drawBorder: false,
          },
          ticks: {
            color: "#64748b",
            stepSize,
            callback(value) {
              const n = Number(value);
              const decimals = Number.isInteger(n) ? 0 : 1;
              return `${n.toFixed(decimals)}%`;
            },
          },
          title: {
            display: true,
            text: "Difference (%)",
            color: "#475569",
            font: { size: 12, weight: "600" },
          },
        },
      },
    };
  }, [chartData]);

  if (!chartData || !chartOptions) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{title} data is not available for this comparison.</AlertDescription>
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
              <Icon as={icon} color="blue.500" boxSize={5} />
              <Heading size="md">{title}</Heading>
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
                <Icon as={icon} color="blue.500" boxSize={5} />
                <Heading size="md">{title}</Heading>
              </HStack>
            ) : null}
            <Text fontSize="xs" color="gray.500" mb={4}>
              {subtitle}
            </Text>
            <Box h={{ base: "300px", md: "250px" }}>
              <Bar
                data={chartData}
                options={chartOptions}
                plugins={[valueLabelsPlugin]}
                aria-label={`${title} chart`}
              />
            </Box>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}
