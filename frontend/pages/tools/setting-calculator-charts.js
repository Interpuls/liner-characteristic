import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import FiltersSummaryCard from "../../components/setting-calculator/FiltersSummaryCard";
import ExportChartsPdfButton from "../../components/setting-calculator/ExportChartsPdfButton";
import PulsationChartCard from "../../components/setting-calculator/charts/PulsationChartCard";
import PulsatorPhasesChartCard from "../../components/setting-calculator/charts/PulsatorPhasesChartCard";
import RealMilkingMassageChartCard from "../../components/setting-calculator/charts/RealMilkingMassageChartCard";
import PercentageDifferenceChartCard from "../../components/setting-calculator/charts/PercentageDifferenceChartCard";
import { FiPercent } from "react-icons/fi";
import { MdPictureAsPdf } from "react-icons/md";
import { getToken } from "../../lib/auth";
import { getMe } from "../../lib/api";
import { safeInternalPath } from "../../lib/navigation";

export default function SettingCalculatorChartsPage() {
  const router = useRouter();
  const { requestId, from } = router.query;
  const baseBackHref = safeInternalPath(typeof from === "string" ? from : "", "/tools/setting-calculator");
  const [runData, setRunData] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const [openExportModal, setOpenExportModal] = useState(null);

  const mapPayloadInputsToFormInputs = (payloadSideInputs = {}) => ({
    milkingVacuumMaxKpa: payloadSideInputs.milkingVacuumMaxKpa ?? payloadSideInputs.milkingVacuumMaxInHg ?? "",
    pfVacuumKpa: payloadSideInputs.pfVacuumKpa ?? payloadSideInputs.pfVacuumInHg ?? "",
    omVacuumKpa: payloadSideInputs.omVacuumKpa ?? payloadSideInputs.omVacuumInHg ?? "",
    omDurationSec: payloadSideInputs.omDurationSec ?? "",
    frequencyBpm: payloadSideInputs.frequencyBpm ?? "",
    ratioPct: payloadSideInputs.ratioPct ?? "",
    phaseAMs: payloadSideInputs.phaseAMs ?? "",
    phaseCMs: payloadSideInputs.phaseCMs ?? "",
  });

  const buildBackToInputsHref = useCallback(() => {
    const leftAppId = Number(runData?.payload?.left?.productApplicationId);
    const rightAppId = Number(runData?.payload?.right?.productApplicationId);
    const leftKey = String(runData?.leftProduct?.key || "").trim();
    const rightKey = String(runData?.rightProduct?.key || "").trim();
    const hasAppIds = Number.isFinite(leftAppId) && Number.isFinite(rightAppId);
    const hasKeys = !!leftKey && !!rightKey;

    const params = new URLSearchParams();
    if (hasAppIds) params.set("app_ids", `${leftAppId},${rightAppId}`);
    if (hasKeys) params.set("keys", `${leftKey},${rightKey}`);
    const withCurrentSelection = `/tools/setting-calculator${params.toString() ? `?${params.toString()}` : ""}`;

    // Guard against malformed or recursive "from" values in production.
    if (!baseBackHref || !baseBackHref.startsWith("/tools/setting-calculator")) return withCurrentSelection;
    if (baseBackHref.startsWith("/tools/setting-calculator-charts")) return withCurrentSelection;

    try {
      const [path, query = ""] = String(baseBackHref).split("?");
      const merged = new URLSearchParams(query);
      merged.delete("ids");
      merged.delete("app_ids");
      merged.delete("keys");
      if (hasAppIds) merged.set("app_ids", `${leftAppId},${rightAppId}`);
      if (hasKeys) merged.set("keys", `${leftKey},${rightKey}`);
      return `${path}${merged.toString() ? `?${merged.toString()}` : ""}`;
    } catch {
      return withCurrentSelection;
    }
  }, [baseBackHref, runData]);

  const persistDraftInputs = useCallback(() => {
    try {
      if (typeof window !== "undefined" && runData?.payload) {
        sessionStorage.setItem(
          "settingCalculator:draftInputs",
          JSON.stringify({
            leftInputs: mapPayloadInputsToFormInputs(runData.payload?.left?.inputs),
            rightInputs: mapPayloadInputsToFormInputs(runData.payload?.right?.inputs),
          })
        );
      }
    } catch {
      // Ignore storage errors.
    }
  }, [runData]);

  const handleBackToInputs = async () => {
    const targetHref = buildBackToInputsHref();
    persistDraftInputs();

    // Use a hard navigation to avoid intermittent Next data-route stalls
    // observed on mobile/prod when going back from charts to inputs.
    if (typeof window !== "undefined") {
      window.location.assign(targetHref);
      return;
    }
    await router.replace(targetHref);
  };

  useEffect(() => {
    // Ensure browser back/forward from this page follows the same robust
    // hard-navigation path used by the app back button.
    router.beforePopState(() => {
      if (typeof window !== "undefined") {
        persistDraftInputs();
        window.location.assign(buildBackToInputsHref());
      }
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [router, buildBackToInputsHref]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("settingCalculator:lastRun");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (requestId && parsed?.payload?.requestId !== requestId) return;
      setRunData(parsed);
    } catch {
      setRunData(null);
    }
  }, [requestId]);

  useEffect(() => {
    const loadUnitSystem = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const me = await getMe(token);
        setUnitSystem(me?.unit_system === "imperial" ? "imperial" : "metric");
      } catch {
        setUnitSystem("metric");
      }
    };
    loadUnitSystem();
  }, []);

  const leftLinerName = runData?.leftProduct?.label || "Left liner";
  const rightLinerName = runData?.rightProduct?.label || "Right liner";
  const percentageSubtitle = `Percentage variation of ${rightLinerName} versus ${leftLinerName}`;

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Setting Calculator"
        subtitle="Comparison results"
        backHref={buildBackToInputsHref()}
        onBackClick={handleBackToInputs}
        showInfo={false}
        rightArea={
          <VStack spacing={0} align="center">
            <IconButton
              aria-label="Export PDF"
              icon={<MdPictureAsPdf size="1.25rem" />}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => openExportModal?.()}
              isDisabled={!runData || !openExportModal}
            />
            <Text fontSize={{ base: "xs", md: "sm" }} lineHeight="1" color="whiteAlpha.800">
              Export
            </Text>
          </VStack>
        }
      />

      <Box
        as="main"
        flex="1"
        w="100%"
        maxW={{ base: "100%", md: "7xl" }}
        mx="auto"
        px={{ base: 4, md: 8 }}
        pt={{ base: 4, md: 6 }}
        pb={{ base: 6, md: 10 }}
      >
        <VStack align="stretch" spacing={4}>
          {!runData ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                No result available in this session. Please run the comparison from the Setting Calculator page first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <FiltersSummaryCard
                leftInputs={runData.response?.left?.inputsUsed}
                rightInputs={runData.response?.right?.inputsUsed}
                leftTitle={runData.leftProduct?.label || "Left"}
                rightTitle={runData.rightProduct?.label || "Right"}
                leftTeatSize={runData.leftProduct?.sizeLabel || ""}
                rightTeatSize={runData.rightProduct?.sizeLabel || ""}
                onBack={handleBackToInputs}
                unitSystem={unitSystem}
              />
              <ExportChartsPdfButton
                runData={runData}
                unitSystem={unitSystem}
                showTrigger={false}
                onRegisterOpen={setOpenExportModal}
              />
              <PulsationChartCard runData={runData} unitSystem={unitSystem} />
              <PulsatorPhasesChartCard runData={runData} />
              <RealMilkingMassageChartCard runData={runData} />
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <PercentageDifferenceChartCard
                  runData={runData}
                  dataKey="appliedVacuum"
                  title="Applied Vacuum Difference"
                  subtitle={percentageSubtitle}
                  icon={FiPercent}
                />
                <PercentageDifferenceChartCard
                  runData={runData}
                  dataKey="massageIntensity"
                  title="Massage Intensity Difference"
                  subtitle={percentageSubtitle}
                  icon={FiPercent}
                />
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
