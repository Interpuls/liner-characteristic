import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
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
  const [isPdfCaptureMode, setIsPdfCaptureMode] = useState(false);

  const pulsationRef = useRef(null);
  const phasesRef = useRef(null);
  const realMilkingRef = useRef(null);
  const appliedVacuumRef = useRef(null);
  const massageIntensityRef = useRef(null);

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

  const buildBackToInputsHref = () => {
    const leftAppId = Number(runData?.payload?.left?.productApplicationId);
    const rightAppId = Number(runData?.payload?.right?.productApplicationId);
    const hasAppIds = Number.isFinite(leftAppId) && Number.isFinite(rightAppId);
    const withAppIds = hasAppIds ? `/tools/setting-calculator?app_ids=${leftAppId},${rightAppId}` : "/tools/setting-calculator";

    // Guard against malformed or recursive "from" values in production.
    if (!baseBackHref || !baseBackHref.startsWith("/tools/setting-calculator")) return withAppIds;
    if (baseBackHref.startsWith("/tools/setting-calculator-charts")) return withAppIds;
    return baseBackHref;
  };

  const handleBackToInputs = () => {
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
    } catch {}
    router.push(buildBackToInputsHref());
  };

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
                onCaptureModeChange={setIsPdfCaptureMode}
                chartRefs={{
                  pulsationRef,
                  phasesRef,
                  realMilkingRef,
                  appliedVacuumRef,
                  massageIntensityRef,
                }}
              />
              <Box ref={pulsationRef}>
                <PulsationChartCard runData={runData} unitSystem={unitSystem} exportMode={isPdfCaptureMode} />
              </Box>
              <Box ref={phasesRef}>
                <PulsatorPhasesChartCard runData={runData} exportMode={isPdfCaptureMode} />
              </Box>
              <Box ref={realMilkingRef}>
                <RealMilkingMassageChartCard runData={runData} exportMode={isPdfCaptureMode} />
              </Box>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <Box ref={appliedVacuumRef}>
                  <PercentageDifferenceChartCard
                    runData={runData}
                    dataKey="appliedVacuum"
                    title="Applied Vacuum Difference"
                    subtitle={percentageSubtitle}
                    icon={FiPercent}
                    exportMode={isPdfCaptureMode}
                  />
                </Box>
                <Box ref={massageIntensityRef}>
                  <PercentageDifferenceChartCard
                    runData={runData}
                    dataKey="massageIntensity"
                    title="Massage Intensity Difference"
                    subtitle={percentageSubtitle}
                    icon={FiPercent}
                    exportMode={isPdfCaptureMode}
                  />
                </Box>
              </SimpleGrid>
            </>
          )}
        </VStack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
