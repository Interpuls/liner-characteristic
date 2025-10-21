// Helper utilities for KPI values returned by the API

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

