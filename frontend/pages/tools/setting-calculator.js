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
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import InputsComparisonTable from "../../components/setting-calculator/InputsComparisonTable";
import FancySelect from "../../components/ui/FancySelect";
import { getToken } from "../../lib/auth";
import {
  compareSettingCalculator,
  deleteSettingComparisonPrefById,
  deleteSettingComparisonPrefByName,
  getMe,
  getProduct,
  listSettingComparisonPrefs,
  listProductApplications,
  listProductApplicationsBatchByProducts,
  listProducts,
  saveSettingComparisonPref,
} from "../../lib/api";
import {
  SETTING_INPUT_FIELDS,
  buildInputsPayloadByUnit,
  createDefaultInputs,
  getSettingInputFields,
  validateCompareInputs,
} from "../../lib/settingCalculator";
import { emptySideErrors, extractApiErrorInfo } from "../../lib/settingCalculatorErrors";
import { formatTeatSize } from "../../lib/teatSizes";

function buildRequestId() {
  return `sc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function withTimeout(promise, ms = 7000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), ms)),
  ]);
}

function createEmptyProductSelection() {
  return {
    appId: null,
    key: "",
    label: "Choose Product",
    brand: "",
    sizeLabel: "-",
    subtitle: "",
  };
}

async function fetchAllProductsForPicker(token) {
  const PAGE_LIMIT = 500;
  const MAX_PAGES = 20; // safeguard
  const all = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const chunk = await withTimeout(listProducts(token, { limit: PAGE_LIMIT, offset }), 10000);
    const safeChunk = Array.isArray(chunk) ? chunk : [];
    all.push(...safeChunk);
    if (safeChunk.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return all;
}

export default function SettingCalculatorPage() {
  const router = useRouter();
  const toast = useToast();
  const { app_ids, ids, keys, from } = router.query;
  const selectedIdsRaw = useMemo(() => {
    const v = typeof app_ids === "string" && app_ids ? app_ids : (typeof ids === "string" ? ids : "");
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [app_ids, ids]);
  const selectedKeysRaw = useMemo(() => {
    return typeof keys === "string" && keys ? keys.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [keys]);
  const selectedIds = useMemo(() => {
    if (selectedIdsRaw.length >= 2) return selectedIdsRaw.slice(0, 2);
    if (selectedIdsRaw.length === 1) return [selectedIdsRaw[0], selectedIdsRaw[0]];
    return [];
  }, [selectedIdsRaw]);
  const selectedKeys = useMemo(() => {
    if (selectedKeysRaw.length >= 2) return selectedKeysRaw.slice(0, 2);
    if (selectedKeysRaw.length === 1) return [selectedKeysRaw[0], selectedKeysRaw[0]];
    return [];
  }, [selectedKeysRaw]);
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
  const [unitSystem, setUnitSystem] = useState("metric");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSide, setPickerSide] = useState("left");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerSelectedKey, setPickerSelectedKey] = useState("");
  const [savedPrefs, setSavedPrefs] = useState([]);
  const [selectedPrefId, setSelectedPrefId] = useState("");
  const [savePrefOpen, setSavePrefOpen] = useState(false);
  const [savePrefName, setSavePrefName] = useState("");
  const [savingPref, setSavingPref] = useState(false);
  const [deletingPref, setDeletingPref] = useState(false);

  const inputFields = useMemo(() => getSettingInputFields(unitSystem), [unitSystem]);

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

      try {
        const me = await getMe(token);
        setUnitSystem(me?.unit_system === "imperial" ? "imperial" : "metric");
        setIsAdmin(me?.role === "admin");
      } catch {
        // global 401 handler in http.js will redirect if needed
      }
      try {
        const prefs = await listSettingComparisonPrefs(token);
        setSavedPrefs(Array.isArray(prefs) ? prefs : []);
      } catch {}

      if (selectedIds.length !== 2 && selectedKeys.length !== 2) {
        setSelection({
          left: createEmptyProductSelection(),
          right: createEmptyProductSelection(),
        });
        setLoadingSelection(false);
        return;
      }

      try {
        const entries = await withTimeout(Promise.all(
          [0, 1].map(async (index) => {
            const [productIdRaw, sizeRaw] = String(selectedKeys[index] || "").split("-");
            const productId = Number(productIdRaw);
            const sizeMm = Number(sizeRaw);
            const appIdFromQuery = Number(selectedIds[index]);

            if (!Number.isFinite(productId)) {
              const safeId = Number.isFinite(appIdFromQuery) ? appIdFromQuery : null;
              return {
                appId: safeId,
                key: safeId ? `app-${safeId}` : "",
                label: `Product ${index + 1}`,
                brand: "Brand",
                sizeLabel: "-",
                subtitle: safeId ? `Application ID ${safeId}` : "Application not resolved",
              };
            }

            let product = null;
            let appId = Number.isFinite(appIdFromQuery) ? appIdFromQuery : null;
            try {
              product = await withTimeout(getProduct(token, productId), 6000);
            } catch {}

            if (!appId && Number.isFinite(sizeMm)) {
              try {
                const apps = await withTimeout(listProductApplications(token, productId), 6000);
                const match = (Array.isArray(apps) ? apps : []).find((a) => Number(a.size_mm) === sizeMm);
                if (match?.id != null) appId = Number(match.id);
              } catch {}
            }

            const label = product?.model || product?.name || `Product ${index + 1}`;
            const sizeLabel = Number.isFinite(sizeMm) ? formatTeatSize(sizeMm) : null;
            const subtitle = [
              product?.brand || null,
              sizeLabel ? `${sizeLabel}${sizeMm ? ` (${sizeMm} mm)` : ""}` : null,
            ].filter(Boolean).join(" • ") || (appId ? `Application ID ${appId}` : "Application not resolved");

            return {
              appId,
              key: Number.isFinite(productId) && Number.isFinite(sizeMm) ? `${productId}-${sizeMm}` : (appId ? `app-${appId}` : ""),
              label,
              brand: product?.brand || "Brand",
              sizeLabel: sizeLabel || "-",
              subtitle,
            };
          })
        ), 10000);

        setSelection({ left: entries[0], right: entries[1] });
      } catch (e) {
        setGlobalError(e?.message || "Error during the loading of selected products.");
        setSelection({
          left: createEmptyProductSelection(),
          right: createEmptyProductSelection(),
        });
      } finally {
        setLoadingSelection(false);
      }
    };

    run();
  }, [router.isReady, selectedIds, selectedKeys]);

  useEffect(() => {
    if (!selectedPrefId) return;
    const pref = savedPrefs.find((p) => String(p.id) === String(selectedPrefId));
    if (!pref?.payload) return;
    const payload = pref.payload;

    if (payload?.leftProduct) {
      setSelection((prev) => ({ ...prev, left: payload.leftProduct }));
    }
    if (payload?.rightProduct) {
      setSelection((prev) => ({ ...prev, right: payload.rightProduct }));
    }
    if (payload?.leftInputs) {
      setLeftInputs((prev) => ({ ...prev, ...payload.leftInputs }));
    }
    if (payload?.rightInputs) {
      setRightInputs((prev) => ({ ...prev, ...payload.rightInputs }));
    }
    setGlobalError("");
    setBackendSummary("");
    setBackendErrors(emptySideErrors());
    setFeErrors(emptySideErrors());
    setTouched(emptySideErrors());
    setHasSubmitted(false);
  }, [selectedPrefId, savedPrefs]);

  const saveCurrentComparison = async () => {
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }
    const name = (savePrefName || "").trim();
    if (!name) {
      toast({ status: "warning", title: "Insert a name" });
      return;
    }
    const payload = {
      leftProduct: selection.left,
      rightProduct: selection.right,
      leftInputs,
      rightInputs,
      unitSystem,
    };
    setSavingPref(true);
    try {
      const saved = await saveSettingComparisonPref(token, name, payload);
      const fresh = await listSettingComparisonPrefs(token);
      setSavedPrefs(Array.isArray(fresh) ? fresh : []);
      if (saved?.id != null) setSelectedPrefId(String(saved.id));
      setSavePrefOpen(false);
      setSavePrefName("");
      toast({ status: "success", title: "Comparison saved" });
    } catch (e) {
      toast({ status: "error", title: e?.message || "Unable to save comparison" });
    } finally {
      setSavingPref(false);
    }
  };

  const deleteSelectedComparison = async () => {
    if (!selectedPrefId) return;
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }
    const pref = savedPrefs.find((p) => String(p.id) === String(selectedPrefId));
    if (!pref) return;
    setDeletingPref(true);
    try {
      try {
        await deleteSettingComparisonPrefById(token, pref.id);
      } catch (err) {
        if (pref.name && err?.status === 404) {
          await deleteSettingComparisonPrefByName(token, pref.name);
        } else {
          throw err;
        }
      }
      const fresh = await listSettingComparisonPrefs(token);
      setSavedPrefs(Array.isArray(fresh) ? fresh : []);
      setSelectedPrefId("");
      toast({ status: "success", title: "Comparison deleted" });
    } catch (e) {
      toast({ status: "error", title: e?.message || "Unable to delete comparison" });
    } finally {
      setDeletingPref(false);
    }
  };

  const filteredPickerOptions = useMemo(() => {
    const q = (pickerSearch || "").trim().toLowerCase();
    if (!q) return pickerOptions;
    return pickerOptions.filter((opt) =>
      `${opt.brand || ""} ${opt.label || ""} ${opt.sizeLabel || ""}`.toLowerCase().includes(q)
    );
  }, [pickerOptions, pickerSearch]);

  const openPicker = async (side) => {
    setPickerSide(side);
    setPickerSearch("");
    setPickerOpen(true);

    const current = side === "left" ? selection.left : selection.right;
    if (current?.key) setPickerSelectedKey(current.key);

    if (pickerOptions.length > 0) return;

    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }

    setGlobalError("");
    setPickerLoading(true);
    try {
      const products = await fetchAllProductsForPicker(token);
      const safeProducts = Array.isArray(products) ? products : [];
      const visibleProducts = safeProducts.filter((p) => isAdmin || !p?.admin_only);
      const productIds = visibleProducts.map((p) => Number(p.id)).filter((id) => Number.isFinite(id));

      const grouped = await withTimeout(
        listProductApplicationsBatchByProducts(token, productIds),
        10000
      );

      const options = [];
      visibleProducts.forEach((p) => {
        const apps = Array.isArray(grouped?.[String(p.id)]) ? grouped[String(p.id)] : [];
        apps.forEach((a) => {
          const sizeMm = Number(a?.size_mm);
          const sizeLabel = Number.isFinite(sizeMm) ? formatTeatSize(sizeMm) : "-";
          options.push({
            key: `${p.id}-${sizeMm}`,
            appId: Number(a?.id),
            productId: Number(p.id),
            label: p?.model || p?.name || "Product",
            brand: p?.brand || "Brand",
            sizeMm: Number.isFinite(sizeMm) ? sizeMm : null,
            sizeLabel,
            subtitle: [p?.brand || null, sizeLabel ? `${sizeLabel}${sizeMm ? ` (${sizeMm} mm)` : ""}` : null]
              .filter(Boolean)
              .join(" • "),
          });
        });
      });

      options.sort((a, b) => {
        const byBrand = String(a.brand || "").localeCompare(String(b.brand || ""));
        if (byBrand !== 0) return byBrand;
        const byModel = String(a.label || "").localeCompare(String(b.label || ""));
        if (byModel !== 0) return byModel;
        return Number(a.sizeMm || 0) - Number(b.sizeMm || 0);
      });

      setPickerOptions(options);
    } catch (e) {
      setGlobalError(e?.message || "Unable to load product applications.");
    } finally {
      setPickerLoading(false);
    }
  };

  const confirmPickerSelection = () => {
    const picked = pickerOptions.find((opt) => opt.key === pickerSelectedKey);
    if (!picked) return;
    setSelection((prev) => ({
      ...prev,
      [pickerSide]: {
        appId: picked.appId,
        key: picked.key,
        label: picked.label,
        brand: picked.brand,
        sizeLabel: picked.sizeLabel || "-",
        subtitle: picked.subtitle,
      },
    }));
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!router.isReady || typeof window === "undefined") return;
    const raw = sessionStorage.getItem("settingCalculator:draftInputs");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.leftInputs) setLeftInputs((prev) => ({ ...prev, ...parsed.leftInputs }));
      if (parsed?.rightInputs) setRightInputs((prev) => ({ ...prev, ...parsed.rightInputs }));
      sessionStorage.removeItem("settingCalculator:draftInputs");
    } catch {
      sessionStorage.removeItem("settingCalculator:draftInputs");
    }
  }, [router.isReady]);

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
        inputs: buildInputsPayloadByUnit(validation.normalized.left, unitSystem),
      },
      right: {
        productApplicationId: Number(selection.right.appId),
        inputs: buildInputsPayloadByUnit(validation.normalized.right, unitSystem),
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

          <HStack spacing={2} align="center">
            <FancySelect
              options={(savedPrefs || []).map((p) => ({ label: p.name, value: String(p.id) }))}
              value={selectedPrefId}
              onChange={setSelectedPrefId}
              placeholder="Saved comparison"
              size="sm"
              w={{ base: "100%", md: "320px" }}
            />
            <IconButton
              aria-label="Delete selected comparison"
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={deleteSelectedComparison}
              isLoading={deletingPref}
              isDisabled={!selectedPrefId}
            />
          </HStack>

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

          <Card
            bg={{ base: "transparent", md: "white" }}
            boxShadow={{ base: "none", md: "sm" }}
            borderWidth={{ base: "0", md: "1px" }}
            borderColor={{ base: "transparent", md: "gray.200" }}
          >
            <CardBody p={{ base: 0, md: 6 }}>
              {loadingSelection ? (
                <VStack py={8} spacing={3}>
                  <Spinner />
                  <Text fontSize="sm" color="gray.600">Loading selected products...</Text>
                </VStack>
              ) : (
                <InputsComparisonTable
                  fields={inputFields}
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
                  onPickLeft={() => openPicker("left")}
                  onPickRight={() => openPicker("right")}
                />
              )}
            </CardBody>
          </Card>

          <HStack justify="center" spacing={3} mb={{ base: 8, md: 10 }}>
            <Button
              variant="outline"
              onClick={() => {
                const current = savedPrefs.find((p) => String(p.id) === String(selectedPrefId));
                setSavePrefName(current?.name || "");
                setSavePrefOpen(true);
              }}
            >
              Save
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleConfirm}
              isLoading={submitting}
              isDisabled={loadingSelection || submitting || !selection.left || !selection.right}
            >
              Confirm
            </Button>
          </HStack>
        </VStack>
      </Box>
      <AppFooter appName="Liner Characteristic App" />

      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select product application</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Input
                placeholder="Search brand, model or teat size"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
              <Box maxH="360px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
                {pickerLoading ? (
                  <VStack py={6} spacing={2}>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color="gray.600">Loading applications...</Text>
                  </VStack>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {filteredPickerOptions.map((opt) => (
                      <HStack key={opt.key} justify="space-between" p={2} borderWidth="1px" borderRadius="md">
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold">{opt.label}</Text>
                          <Text fontSize="xs" color="gray.600">{opt.subtitle}</Text>
                        </Box>
                        <input
                          type="radio"
                          name="setting-calculator-app-picker"
                          checked={pickerSelectedKey === opt.key}
                          onChange={() => setPickerSelectedKey(opt.key)}
                        />
                      </HStack>
                    ))}
                    {filteredPickerOptions.length === 0 && !pickerLoading ? (
                      <Text fontSize="sm" color="gray.600" px={2} py={1}>No applications found.</Text>
                    ) : null}
                  </VStack>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack w="full" justify="space-between">
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
              <Button colorScheme="blue" onClick={confirmPickerSelection} isDisabled={!pickerSelectedKey}>
                Confirm
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={savePrefOpen} onClose={() => setSavePrefOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save comparison</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder="Comparison name"
              value={savePrefName}
              onChange={(e) => setSavePrefName(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <HStack w="full" justify="space-between">
              <Button variant="ghost" onClick={() => setSavePrefOpen(false)} isDisabled={savingPref}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={saveCurrentComparison} isLoading={savingPref}>
                Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
