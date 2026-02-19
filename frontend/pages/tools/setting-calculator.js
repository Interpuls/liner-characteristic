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
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import InputsComparisonTable from "../../components/setting-calculator/InputsComparisonTable";
import { getToken } from "../../lib/auth";
import { compareSettingCalculator, getProduct } from "../../lib/api";
import { createDefaultInputs, validateCompareInputs } from "../../lib/settingCalculator";
import { formatTeatSize } from "../../lib/teatSizes";

function buildRequestId() {
  return `sc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function safeParseJson(raw) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractApiErrorInfo(err) {
  const emptyFields = { left: {}, right: {} };

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
      const mapped = { left: {}, right: {} };

      for (const f of fieldList) {
        const path = String(f?.path || "");
        const reason = String(f?.reason || "Invalid value");
        const m = path.match(/^(left|right)\.inputs\.(.+)$/);
        if (!m) continue;
        const side = m[1];
        const field = m[2];
        mapped[side][field] = reason;
      }

      const hasMapped = Object.keys(mapped.left).length > 0 || Object.keys(mapped.right).length > 0;
      const message = detail?.error?.message || "Invalid inputs";
      return { message, fieldErrors: hasMapped ? mapped : emptyFields };
    }

    if (typeof detail?.detail === "string") {
      return { message: detail.detail, fieldErrors: emptyFields };
    }
    if (typeof detail?.message === "string") {
      return { message: detail.message, fieldErrors: emptyFields };
    }
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return { message: err.message, fieldErrors: emptyFields };
  }

  return { message: "Errore durante il confronto impostazioni.", fieldErrors: emptyFields };
}

export default function SettingCalculatorPage() {
  const router = useRouter();
  const { app_ids, ids, keys, from } = router.query;
  const selectedIds = useMemo(() => {
    const v = typeof app_ids === "string" && app_ids ? app_ids : (typeof ids === "string" ? ids : "");
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [app_ids, ids]);
  const selectedKeys = useMemo(() => {
    return typeof keys === "string" && keys ? keys.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [keys]);
  const backHref = typeof from === "string" && from ? decodeURIComponent(from) : "/product/result";

  const [leftInputs, setLeftInputs] = useState(createDefaultInputs);
  const [rightInputs, setRightInputs] = useState(createDefaultInputs);
  const [formErrors, setFormErrors] = useState({ left: {}, right: {} });
  const [globalError, setGlobalError] = useState("");
  const [loadingSelection, setLoadingSelection] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState({ left: null, right: null });

  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;

      const token = getToken();
      if (!token) {
        window.location.replace("/login");
        return;
      }

      if (selectedIds.length !== 2) {
        setGlobalError("Setting Calculator richiede esattamente 2 prodotti selezionati.");
        setLoadingSelection(false);
        return;
      }

      const fallback = selectedIds.map((appId, index) => ({
        appId: Number(appId),
        label: `Product ${index + 1}`,
        brand: "Brand",
        sizeLabel: "-",
        subtitle: `Application ID ${appId}`,
      }));

      if (selectedKeys.length !== selectedIds.length) {
        setSelection({ left: fallback[0], right: fallback[1] });
        setLoadingSelection(false);
        return;
      }

      try {
        const entries = await Promise.all(
          selectedIds.map(async (appId, index) => {
            const [productIdRaw, sizeRaw] = String(selectedKeys[index] || "").split("-");
            const productId = Number(productIdRaw);
            const sizeMm = Number(sizeRaw);

            if (!Number.isFinite(productId)) {
              return fallback[index];
            }

            const product = await getProduct(token, productId);
            const label = product?.model || product?.name || `Product ${index + 1}`;
            const sizeLabel = Number.isFinite(sizeMm) ? formatTeatSize(sizeMm) : null;
            const subtitle = [
              product?.brand || null,
              sizeLabel ? `${sizeLabel}${sizeMm ? ` (${sizeMm} mm)` : ""}` : null,
            ].filter(Boolean).join(" • ") || `Application ID ${appId}`;

            return {
              appId: Number(appId),
              label,
              brand: product?.brand || "Brand",
              sizeLabel: sizeLabel || "-",
              subtitle,
            };
          })
        );

        setSelection({ left: entries[0], right: entries[1] });
      } catch (e) {
        setGlobalError(e?.message || "Errore durante il caricamento dei prodotti selezionati.");
        setSelection({ left: fallback[0], right: fallback[1] });
      } finally {
        setLoadingSelection(false);
      }
    };

    run();
  }, [router.isReady, selectedIds, selectedKeys]);

  const handleChangeLeft = (field, value) => {
    setLeftInputs((prev) => ({ ...prev, [field]: value }));
    if (formErrors.left?.[field]) setFormErrors((prev) => ({ ...prev, left: { ...prev.left, [field]: undefined } }));
  };

  const handleChangeRight = (field, value) => {
    setRightInputs((prev) => ({ ...prev, [field]: value }));
    if (formErrors.right?.[field]) setFormErrors((prev) => ({ ...prev, right: { ...prev.right, [field]: undefined } }));
  };

  const handleConfirm = async () => {
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }

    setGlobalError("");
    setFormErrors({ left: {}, right: {} });
    const validation = validateCompareInputs(leftInputs, rightInputs);
    if (validation.hasErrors) {
      setFormErrors(validation.errors);
      return;
    }

    if (!selection.left?.appId || !selection.right?.appId) {
      setGlobalError("Selezione prodotti non valida.");
      return;
    }

    const requestId = buildRequestId();
    const payload = {
      schemaVersion: "1.0",
      requestId,
      left: {
        productApplicationId: Number(selection.left.appId),
        inputs: validation.normalized.left,
      },
      right: {
        productApplicationId: Number(selection.right.appId),
        inputs: validation.normalized.right,
      },
    };

    setSubmitting(true);
    try {
      const response = await compareSettingCalculator(token, payload);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "settingCalculator:lastRun",
          JSON.stringify({
            payload,
            response,
            leftProduct: selection.left,
            rightProduct: selection.right,
          })
        );
      }
      const fromCurrent = encodeURIComponent(router.asPath || "/tools/setting-calculator");
      router.push(`/tools/setting-calculator-charts?requestId=${encodeURIComponent(requestId)}&from=${fromCurrent}`);
    } catch (e) {
      const parsed = extractApiErrorInfo(e);
      setFormErrors(parsed.fieldErrors);
      setGlobalError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Setting Calculator" subtitle="Confronto impostazioni" backHref={backHref} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Input Settings</Heading>
          <Text fontSize="sm" color="gray.600">
            Inserisci i parametri per i due prodotti selezionati, poi conferma per generare i grafici comparativi.
          </Text>

          {globalError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardBody>
              {loadingSelection ? (
                <VStack py={8} spacing={3}>
                  <Spinner />
                  <Text fontSize="sm" color="gray.600">Caricamento prodotti selezionati...</Text>
                </VStack>
              ) : (
                <InputsComparisonTable
                  leftProduct={selection.left}
                  rightProduct={selection.right}
                  leftValues={leftInputs}
                  rightValues={rightInputs}
                  leftErrors={formErrors.left}
                  rightErrors={formErrors.right}
                  onChangeLeft={handleChangeLeft}
                  onChangeRight={handleChangeRight}
                />
              )}
            </CardBody>
          </Card>

          <HStack justify="flex-end">
            <Button
              colorScheme="blue"
              onClick={handleConfirm}
              isLoading={submitting}
              isDisabled={loadingSelection || !!globalError || !selection.left || !selection.right}
            >
              Conferma e Genera Grafici
            </Button>
          </HStack>
        </VStack>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
