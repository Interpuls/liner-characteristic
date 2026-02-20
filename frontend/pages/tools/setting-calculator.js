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
import { SETTING_INPUT_FIELDS, createDefaultInputs, validateCompareInputs } from "../../lib/settingCalculator";
import { emptySideErrors, extractApiErrorInfo } from "../../lib/settingCalculatorErrors";
import { formatTeatSize } from "../../lib/teatSizes";

function buildRequestId() {
  return `sc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
  const [feErrors, setFeErrors] = useState(emptySideErrors);
  const [backendErrors, setBackendErrors] = useState(emptySideErrors);
  const [touched, setTouched] = useState(emptySideErrors);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [backendSummary, setBackendSummary] = useState("");
  const [loadingSelection, setLoadingSelection] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState({ left: null, right: null });

  const visibleFeErrors = useMemo(() => {
    const visible = emptySideErrors();
    for (const field of SETTING_INPUT_FIELDS) {
      const key = field.key;
      if (hasSubmitted || touched.left?.[key]) visible.left[key] = feErrors.left?.[key];
      if (hasSubmitted || touched.right?.[key]) visible.right[key] = feErrors.right?.[key];
    }
    return visible;
  }, [feErrors, touched, hasSubmitted]);

  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;

      const token = getToken();
      if (!token) {
        window.location.replace("/login");
        return;
      }

      if (selectedIds.length !== 2) {
        setGlobalError("Setting Calculator requires exactly 2 products selected.");
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
        setGlobalError(e?.message || "Error during the loading of selected products.");
        setSelection({ left: fallback[0], right: fallback[1] });
      } finally {
        setLoadingSelection(false);
      }
    };

    run();
  }, [router.isReady, selectedIds, selectedKeys]);

  const clearBackendFieldError = (side, field) => {
    setBackendErrors((prev) => {
      const next = {
        left: { ...prev.left },
        right: { ...prev.right },
      };
      delete next[side][field];
      return next;
    });
    setBackendSummary("");
  };

  const handleChangeLeft = (field, value) => {
    setLeftInputs((prev) => {
      const next = { ...prev, [field]: value };
      const validation = validateCompareInputs(next, rightInputs);
      setFeErrors(validation.errors);
      return next;
    });
    clearBackendFieldError("left", field);
  };

  const handleChangeRight = (field, value) => {
    setRightInputs((prev) => {
      const next = { ...prev, [field]: value };
      const validation = validateCompareInputs(leftInputs, next);
      setFeErrors(validation.errors);
      return next;
    });
    clearBackendFieldError("right", field);
  };

  const handleBlurLeft = (field) => {
    setTouched((prev) => ({
      ...prev,
      left: { ...prev.left, [field]: true },
    }));
  };

  const handleBlurRight = (field) => {
    setTouched((prev) => ({
      ...prev,
      right: { ...prev.right, [field]: true },
    }));
  };

  const handleConfirm = async () => {
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }

    setGlobalError("");
    setBackendSummary("");
    setBackendErrors(emptySideErrors());
    setHasSubmitted(true);
    const validation = validateCompareInputs(leftInputs, rightInputs);
    setFeErrors(validation.errors);
    if (validation.hasErrors) {
      return;
    }

    if (!selection.left?.appId || !selection.right?.appId) {
      setGlobalError("Selected products are not valid.");
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
      const hasFieldErrors =
        Object.keys(parsed.fieldErrors.left || {}).length > 0 ||
        Object.keys(parsed.fieldErrors.right || {}).length > 0;

      if (parsed.isValidation || hasFieldErrors) {
        setBackendErrors(parsed.fieldErrors);
        setBackendSummary(parsed.message || "Invalid inputs");
      } else {
        setGlobalError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Setting Calculator" subtitle="Liners comparison" backHref={backHref} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Input Settings</Heading>
          <Text fontSize="sm" color="gray.600">
            Insert the parameters for the two selected products, then confirm to generate the comparative charts.
          </Text>

          {globalError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          ) : null}

          {backendSummary ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{backendSummary}</AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardBody>
              {loadingSelection ? (
                <VStack py={8} spacing={3}>
                  <Spinner />
                  <Text fontSize="sm" color="gray.600">Loading selected products...</Text>
                </VStack>
              ) : (
                <InputsComparisonTable
                  leftProduct={selection.left}
                  rightProduct={selection.right}
                  leftValues={leftInputs}
                  rightValues={rightInputs}
                  leftErrors={visibleFeErrors.left}
                  rightErrors={visibleFeErrors.right}
                  leftBackendErrors={backendErrors.left}
                  rightBackendErrors={backendErrors.right}
                  onChangeLeft={handleChangeLeft}
                  onChangeRight={handleChangeRight}
                  onBlurLeft={handleBlurLeft}
                  onBlurRight={handleBlurRight}
                />
              )}
            </CardBody>
          </Card>

          <HStack justify="flex-end">
            <Button
              colorScheme="blue"
              onClick={handleConfirm}
              isLoading={submitting}
              isDisabled={loadingSelection || submitting || !selection.left || !selection.right}
            >
              Confirm and Generate Charts
            </Button>
          </HStack>
        </VStack>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
