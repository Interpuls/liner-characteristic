export const SETTING_INPUT_FIELDS = [
  { key: "milkingVacuumMaxKpa", label: "Milking Vacuum Max", unit: "kPa", step: "0.1", min: 0, required: true },
  { key: "pfVacuumKpa", label: "PF Vacuum", unit: "kPa", step: "0.1", min: 0, required: true },
  { key: "omVacuumKpa", label: "OM Vacuum", unit: "kPa", step: "0.1", min: 0, required: true },
  { key: "omDurationSec", label: "OM Duration", unit: "sec", step: "0.1", min: 0, required: true },
  { key: "frequencyBpm", label: "Frequency", unit: "bpm", step: "0.1", min: 0, required: true },
  { key: "ratioPct", label: "Ratio", unit: "%", step: "0.1", min: 0, max: 100, required: true },
  { key: "phaseAMs", label: "Phase A", unit: "ms", step: "0.1", min: 0, required: true },
  { key: "phaseCMs", label: "Phase C", unit: "ms", step: "0.1", min: 0, required: true },
];

const PRESSURE_KEYS = new Set(["milkingVacuumMaxKpa", "pfVacuumKpa", "omVacuumKpa"]);

export function getSettingInputFields(unitSystem = "metric") {
  const isImperial = unitSystem === "imperial";
  return SETTING_INPUT_FIELDS.map((f) => ({
    ...f,
    unit: PRESSURE_KEYS.has(f.key) && isImperial ? "inHg" : f.unit,
  }));
}

export function createDefaultInputs() {
  return {
    milkingVacuumMaxKpa: "",
    pfVacuumKpa: "",
    omVacuumKpa: "",
    omDurationSec: "",
    frequencyBpm: "",
    ratioPct: "",
    phaseAMs: "",
    phaseCMs: "",
  };
}

export function buildInputsPayloadByUnit(normalizedSideInputs, unitSystem = "metric") {
  if (unitSystem === "imperial") {
    return {
      milkingVacuumMaxInHg: normalizedSideInputs.milkingVacuumMaxKpa,
      pfVacuumInHg: normalizedSideInputs.pfVacuumKpa,
      omVacuumInHg: normalizedSideInputs.omVacuumKpa,
      omDurationSec: normalizedSideInputs.omDurationSec,
      frequencyBpm: normalizedSideInputs.frequencyBpm,
      ratioPct: normalizedSideInputs.ratioPct,
      phaseAMs: normalizedSideInputs.phaseAMs,
      phaseCMs: normalizedSideInputs.phaseCMs,
    };
  }

  return {
    milkingVacuumMaxKpa: normalizedSideInputs.milkingVacuumMaxKpa,
    pfVacuumKpa: normalizedSideInputs.pfVacuumKpa,
    omVacuumKpa: normalizedSideInputs.omVacuumKpa,
    omDurationSec: normalizedSideInputs.omDurationSec,
    frequencyBpm: normalizedSideInputs.frequencyBpm,
    ratioPct: normalizedSideInputs.ratioPct,
    phaseAMs: normalizedSideInputs.phaseAMs,
    phaseCMs: normalizedSideInputs.phaseCMs,
  };
}

function toNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validateSide(values, sideName) {
  const errs = {};
  const out = {};

  for (const f of SETTING_INPUT_FIELDS) {
    const n = toNum(values?.[f.key]);
    out[f.key] = n;
    if (n == null) {
      errs[f.key] = "Required";
      continue;
    }
    if (f.required && n < 0) errs[f.key] = "Must be >= 0";
  }

  if (out.frequencyBpm != null && out.frequencyBpm <= 0) errs.frequencyBpm = "Must be > 0";
  if (out.ratioPct != null && (out.ratioPct <= 0 || out.ratioPct >= 100)) errs.ratioPct = "Must be between 0 and 100";
  if (out.phaseAMs != null && out.phaseAMs <= 0) errs.phaseAMs = "Must be > 0";
  if (out.phaseCMs != null && out.phaseCMs <= 0) errs.phaseCMs = "Must be > 0";

  if (out.milkingVacuumMaxKpa != null && out.milkingVacuumMaxKpa <= 0) {
    errs.milkingVacuumMaxKpa = "Must be > 0";
  }
  if (out.pfVacuumKpa != null && out.milkingVacuumMaxKpa != null && out.pfVacuumKpa > out.milkingVacuumMaxKpa) {
    errs.pfVacuumKpa = "Must be <= Milking Vacuum Max";
  }
  if (out.omVacuumKpa != null && out.milkingVacuumMaxKpa != null && out.omVacuumKpa > out.milkingVacuumMaxKpa) {
    errs.omVacuumKpa = "Must be <= Milking Vacuum Max";
  }
  if (out.omVacuumKpa != null && out.pfVacuumKpa != null && out.omVacuumKpa < out.pfVacuumKpa) {
    errs.omVacuumKpa = "Must be >= PF Vacuum";
  }

  if (out.frequencyBpm && out.ratioPct) {
    const tMs = 60000 / out.frequencyBpm;
    const onMs = tMs * (out.ratioPct / 100);
    const offMs = tMs - onMs;
    if (out.phaseAMs != null && out.phaseAMs > onMs) errs.phaseAMs = "Cannot exceed ON time";
    if (out.phaseCMs != null && out.phaseCMs > offMs) errs.phaseCMs = "Cannot exceed OFF time";
  }

  return { sideName, errs, output: out };
}

export function validateCompareInputs(leftValues, rightValues) {
  const left = validateSide(leftValues, "left");
  const right = validateSide(rightValues, "right");
  const hasErrors = Object.keys(left.errs).length > 0 || Object.keys(right.errs).length > 0;

  return {
    hasErrors,
    errors: {
      left: left.errs,
      right: right.errs,
    },
    normalized: {
      left: left.output,
      right: right.output,
    },
  };
}
