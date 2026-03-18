import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Legend, Tooltip);

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

function normalizeSegments(segments) {
  const order = ["A", "B", "C", "D"];
  const byKey = new Map();
  for (const seg of segments || []) {
    const key = String(seg?.key || "").toUpperCase();
    if (!order.includes(key)) continue;
    byKey.set(key, Number(seg?.valueMs || 0));
  }
  return order.map((key) => ({ key, valueMs: byKey.get(key) || 0 }));
}

function getBarValue(bars, expectedKey) {
  const found = (bars || []).find((bar) => String(bar?.key || "").toLowerCase() === expectedKey.toLowerCase());
  return Number(found?.valueMs || 0);
}

function pickNiceStep(range) {
  if (!Number.isFinite(range) || range <= 0) return 5;
  const rough = range / 5;
  const candidates = [1, 2, 5, 10, 20, 25, 50];
  return candidates.find((s) => s >= rough) || Math.ceil(rough / 10) * 10;
}

function renderChartToDataUrl(config, { width, height }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable.");
  const chart = new ChartJS(ctx, config);
  chart.update("none");
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return dataUrl;
}

function buildPulsationChart(runData, unitSystem) {
  const pressureUnitLabel = unitSystem === "imperial" ? "inHg" : "kPa";
  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";
  const leftTeat = runData?.leftProduct?.sizeLabel || "-";
  const rightTeat = runData?.rightProduct?.sizeLabel || "-";
  const leftLegendLabel = `${leftLabel} (${leftTeat})`;
  const rightLegendLabel = `${rightLabel} (${rightTeat})`;

  const leftCurve = runData?.response?.left?.charts?.pulsation?.curve;
  const leftThreshold = runData?.response?.left?.charts?.pulsation?.threshold;
  const rightCurve = runData?.response?.right?.charts?.pulsation?.curve;
  const rightThreshold = runData?.response?.right?.charts?.pulsation?.threshold;

  const leftLine = toLineData(leftCurve?.points, unitSystem);
  const rightLine = toLineData(rightCurve?.points, unitSystem);
  const leftThr = toLineData(leftThreshold?.points, unitSystem);
  const rightThr = toLineData(rightThreshold?.points, unitSystem);
  if (!(leftLine.length || rightLine.length || leftThr.length || rightThr.length)) return null;

  return {
    title: "Pulsation Chart",
    width: 1200,
    height: 560,
    config: {
      type: "line",
      data: {
        datasets: [
          { label: leftLegendLabel, data: leftLine, parsing: false, borderColor: "rgba(43, 108, 176, 1)", borderWidth: 3, pointRadius: 0, tension: 0 },
          { label: rightLegendLabel, data: rightLine, parsing: false, borderColor: "rgba(79, 209, 197, 1)", borderWidth: 3, pointRadius: 0, tension: 0 },
          { label: `${leftLegendLabel} threshold`, data: leftThr, parsing: false, borderColor: "rgba(66, 153, 225, 0.9)", borderWidth: 2, borderDash: [6, 6], pointRadius: 0, tension: 0 },
          { label: `${rightLegendLabel} threshold`, data: rightThr, parsing: false, borderColor: "rgba(56, 178, 172, 0.9)", borderWidth: 2, borderDash: [6, 6], pointRadius: 0, tension: 0 },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#475569", font: { size: 12, weight: "600" } } },
          tooltip: { enabled: false },
        },
        scales: {
          x: { type: "linear", min: 0, grid: { color: "#e2e8f0" }, ticks: { color: "#64748b", maxTicksLimit: 6, callback: (v) => `${v} ms` }, title: { display: true, text: "Time (ms)", color: "#475569", font: { size: 12, weight: "600" } } },
          y: { min: 0, grid: { color: "#e2e8f0" }, ticks: { color: "#64748b", maxTicksLimit: 6 }, title: { display: true, text: `Vacuum (${pressureUnitLabel})`, color: "#475569", font: { size: 12, weight: "600" } } },
        },
      },
    },
  };
}

function buildPulsatorPhasesChart(runData) {
  const leftRaw = runData?.response?.left?.charts?.pulsatorPhases?.segments;
  const rightRaw = runData?.response?.right?.charts?.pulsatorPhases?.segments;
  const leftSegments = normalizeSegments(leftRaw);
  const rightSegments = normalizeSegments(rightRaw);
  if (!leftSegments.length || !rightSegments.length) return null;

  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";
  const leftTeat = runData?.leftProduct?.sizeLabel || "-";
  const rightTeat = runData?.rightProduct?.sizeLabel || "-";
  const labels = [`${leftLabel} (${leftTeat})`, `${rightLabel} (${rightTeat})`];
  const order = ["A", "B", "C", "D"];
  const byPhase = Object.fromEntries(order.map((phase) => [phase, [0, 0]]));
  leftSegments.forEach((seg) => { byPhase[seg.key][0] = Number(seg.valueMs || 0); });
  rightSegments.forEach((seg) => { byPhase[seg.key][1] = Number(seg.valueMs || 0); });

  return {
    title: "Pulsator Phases",
    width: 1200,
    height: 360,
    config: {
      type: "bar",
      data: {
        labels,
        datasets: order.map((phase) => ({
          label: phase,
          data: byPhase[phase],
          backgroundColor: { A: "rgba(26, 54, 93, 0.96)", B: "rgba(43, 108, 176, 0.94)", C: "rgba(49, 130, 206, 0.92)", D: "rgba(79, 209, 197, 0.9)" }[phase],
          borderColor: "transparent",
          borderWidth: 0,
          borderSkipped: false,
          barThickness: 26,
        })),
      },
      options: {
        responsive: false,
        animation: false,
        indexAxis: "y",
        plugins: {
          legend: { position: "bottom", labels: { color: "#475569", font: { size: 12, weight: "600" } } },
          tooltip: { enabled: false },
        },
        scales: {
          x: { stacked: true, min: 0, grid: { color: "#e2e8f0" }, ticks: { color: "#64748b", callback: (v) => `${v} ms` } },
          y: { stacked: true, grid: { display: false }, ticks: { color: "#334155", font: { size: 12, weight: "600" } } },
        },
      },
    },
  };
}

function buildRealMilkingChart(runData) {
  const leftBars = Array.isArray(runData?.response?.left?.charts?.realMilkingMassage?.bars)
    ? runData.response.left.charts.realMilkingMassage.bars
    : [];
  const rightBars = Array.isArray(runData?.response?.right?.charts?.realMilkingMassage?.bars)
    ? runData.response.right.charts.realMilkingMassage.bars
    : [];
  const leftMilking = getBarValue(leftBars, "Real Milking");
  const leftOff = getBarValue(leftBars, "Real OFF");
  const rightMilking = getBarValue(rightBars, "Real Milking");
  const rightOff = getBarValue(rightBars, "Real OFF");
  const hasData = leftMilking > 0 || leftOff > 0 || rightMilking > 0 || rightOff > 0;
  if (!hasData) return null;

  const leftLabel = runData?.leftProduct?.label || "Left";
  const rightLabel = runData?.rightProduct?.label || "Right";
  const leftTeat = runData?.leftProduct?.sizeLabel || "-";
  const rightTeat = runData?.rightProduct?.sizeLabel || "-";
  const labels = [`${leftLabel} (${leftTeat})`, `${rightLabel} (${rightTeat})`];

  return {
    title: "Real Milking / Real OFF",
    width: 1200,
    height: 340,
    config: {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Real Milking", data: [leftMilking, rightMilking], backgroundColor: "rgba(43, 108, 176, 0.95)", borderColor: "transparent", borderWidth: 0, borderSkipped: false, barThickness: 28 },
          { label: "Real OFF", data: [leftOff, rightOff], backgroundColor: "rgba(79, 209, 197, 0.92)", borderColor: "transparent", borderWidth: 0, borderSkipped: false, barThickness: 28 },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        indexAxis: "y",
        plugins: {
          legend: { position: "bottom", labels: { color: "#475569", font: { size: 12, weight: "600" } } },
          tooltip: { enabled: false },
        },
        scales: {
          x: { stacked: true, min: 0, grid: { color: "#e2e8f0" }, ticks: { color: "#64748b", callback: (v) => `${v} ms` } },
          y: { stacked: true, grid: { display: false }, ticks: { color: "#334155", font: { size: 12, weight: "600" } } },
        },
      },
    },
  };
}

function buildPercentageChart(runData, dataKey, title) {
  const diffPct = runData?.response?.diffPct?.[dataKey];
  const pf = Number(diffPct?.pf);
  const om = Number(diffPct?.om);
  if (!Number.isFinite(pf) || !Number.isFinite(om)) return null;
  const values = [pf, om];
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const pad = Math.max(5, Math.abs(maxVal - minVal) * 0.18);
  const rawMin = minVal - pad;
  const rawMax = maxVal + pad;
  const stepSize = pickNiceStep(rawMax - rawMin);
  const niceMin = Math.floor(rawMin / stepSize) * stepSize;
  const niceMax = Math.ceil(rawMax / stepSize) * stepSize;

  return {
    title,
    width: 900,
    height: 280,
    config: {
      type: "bar",
      data: {
        labels: ["PF", "OM"],
        datasets: [
          {
            label: "Difference (%)",
            data: values,
            backgroundColor: ["rgba(43, 108, 176, 0.95)", "rgba(79, 209, 197, 0.92)"],
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 10,
            borderSkipped: false,
            barThickness: 44,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#334155", font: { size: 12, weight: "600" } } },
          y: {
            min: niceMin,
            max: niceMax,
            grid: { color: "#e2e8f0" },
            ticks: { color: "#64748b", stepSize, callback: (v) => `${Number(v).toFixed(Number.isInteger(Number(v)) ? 0 : 1)}%` },
            title: { display: true, text: "Difference (%)", color: "#475569", font: { size: 12, weight: "600" } },
          },
        },
      },
    },
  };
}

export function createSettingCalculatorExportCharts(runData, unitSystem = "metric") {
  const defs = [
    buildPulsationChart(runData, unitSystem),
    buildPulsatorPhasesChart(runData),
    buildRealMilkingChart(runData),
    buildPercentageChart(runData, "appliedVacuum", "Applied Vacuum Difference"),
    buildPercentageChart(runData, "massageIntensity", "Massage Intensity Difference"),
  ].filter(Boolean);
  if (defs.length !== 5) return null;
  return defs.map((def) => ({
    title: def.title,
    dataUrl: renderChartToDataUrl(def.config, { width: def.width, height: def.height }),
  }));
}
