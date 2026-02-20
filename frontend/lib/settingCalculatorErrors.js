export function emptySideErrors() {
  return { left: {}, right: {} };
}

function safeParseJson(raw) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function applyBackendErrorsToForm(fields) {
  const mapped = emptySideErrors();
  if (!Array.isArray(fields)) return mapped;

  const fieldAlias = {
    milkingVacuumMaxInHg: "milkingVacuumMaxKpa",
    pfVacuumInHg: "pfVacuumKpa",
    omVacuumInHg: "omVacuumKpa",
  };

  for (const f of fields) {
    const path = String(f?.path || "");
    const reason = String(f?.reason || "Invalid value");
    const m = path.match(/^(left|right)\.inputs\.(.+)$/);
    if (!m) continue;
    const side = m[1];
    const field = fieldAlias[m[2]] || m[2];
    mapped[side][field] = reason;
  }

  return mapped;
}

export function extractApiErrorInfo(err) {
  const emptyFields = emptySideErrors();

  let payload = err?.payload ?? null;
  if (!payload && typeof err?.message === "string") {
    payload = safeParseJson(err.message);
  }
  if (typeof payload === "string") {
    payload = safeParseJson(payload);
  }

  const detail = payload?.detail ?? payload;

  if (detail && typeof detail === "object") {
    const fieldList = detail?.error?.fields;
    if (Array.isArray(fieldList)) {
      const mapped = applyBackendErrorsToForm(fieldList);
      const hasMapped = Object.keys(mapped.left).length > 0 || Object.keys(mapped.right).length > 0;
      const message = detail?.error?.message || "Invalid inputs";
      return { message, fieldErrors: hasMapped ? mapped : emptyFields, isValidation: true };
    }

    if (typeof detail?.detail === "string") {
      return { message: detail.detail, fieldErrors: emptyFields, isValidation: err?.status === 422 };
    }
    if (typeof detail?.message === "string") {
      return { message: detail.message, fieldErrors: emptyFields, isValidation: err?.status === 422 };
    }
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return { message: err.message, fieldErrors: emptyFields, isValidation: err?.status === 422 };
  }

  return { message: "Errore durante il confronto impostazioni.", fieldErrors: emptyFields, isValidation: false };
}
