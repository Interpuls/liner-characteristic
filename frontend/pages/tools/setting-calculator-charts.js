import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import FiltersSummaryCard from "../../components/setting-calculator/FiltersSummaryCard";
import PulsationChartCard from "../../components/setting-calculator/charts/PulsationChartCard";
import PulsatorPhasesChartCard from "../../components/setting-calculator/charts/PulsatorPhasesChartCard";
import RealMilkingMassageChartCard from "../../components/setting-calculator/charts/RealMilkingMassageChartCard";
import PercentageDifferenceChartCard from "../../components/setting-calculator/charts/PercentageDifferenceChartCard";
import { FiPercent } from "react-icons/fi";
import { getToken } from "../../lib/auth";
import { getMe } from "../../lib/api";
import { safeInternalPath } from "../../lib/navigation";

export default function SettingCalculatorChartsPage() {
  const router = useRouter();
  const { requestId, from } = router.query;
  const backHref = safeInternalPath(typeof from === "string" ? from : "", "/tools/setting-calculator");
  const [runData, setRunData] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");

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
    router.push(backHref);
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

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Setting Calculator Charts"
        subtitle="Comparison results"
        backHref={backHref}
        onBackClick={handleBackToInputs}
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
              <PulsationChartCard runData={runData} unitSystem={unitSystem} />
              <PulsatorPhasesChartCard runData={runData} />
              <RealMilkingMassageChartCard runData={runData} />
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <PercentageDifferenceChartCard
                  runData={runData}
                  dataKey="appliedVacuum"
                  title="Applied Vacuum Difference"
                  subtitle="Percentage difference between PF and OM applied vacuum."
                  icon={FiPercent}
                />
                <PercentageDifferenceChartCard
                  runData={runData}
                  dataKey="massageIntensity"
                  title="Massage Intensity Difference"
                  subtitle="Percentage difference between PF and OM massage intensity."
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
