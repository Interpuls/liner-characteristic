// Helper utilities for KPI values returned by the API

export const KPI_ORDER = [
  "CLOSURE",
  "FITTING",
  "CONGESTION_RISK",
  "HYPERKERATOSIS_RISK",
  "SPEED",
  "RESPRAY",
  "FLUYDODINAMIC",
  "SLIPPAGE",
  "RINGING_RISK",
];

export const KPI_LABELS = {
  CLOSURE: "Gentile Closure",
  FITTING: "Better Fitting",
  CONGESTION_RISK: "Low Congestion",
  HYPERKERATOSIS_RISK: "Low Hyperkeratosis",
  SPEED: "High speed",
  RESPRAY: "Low respray",
  FLUYDODINAMIC: "Better fluidodinamic",
  SLIPPAGE: "Low slippage",
  RINGING_RISK: "Low ringing risk",
};

export function formatKpiLabel(code) {
  return KPI_LABELS[code] || String(code || "").replaceAll("_", " ");
}

// Given an array of KPI value objects (possibly multiple per kpi_code),
// return a map { [kpi_code]: latestValue } where latest is the one with
// the highest run_id (numeric compare). If run_id is missing, treat as -Infinity.
export function latestKpiByCode(values) {
  const map = {};
  (Array.isArray(values) ? values : []).forEach((v) => {
    const code = v?.kpi_code;
    if (!code) return;
    const curr = map[code];
    const r = Number(v?.run_id ?? -Infinity);
    const rcurr = Number(curr?.run_id ?? -Infinity);
    if (!curr || r > rcurr) map[code] = v;
  });
  return map;
}

