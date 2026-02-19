import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
  Text,
  VStack,
} from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";

export default function SettingCalculatorChartsPage() {
  const router = useRouter();
  const { requestId, from } = router.query;
  const backHref = typeof from === "string" && from ? decodeURIComponent(from) : "/tools/setting-calculator";
  const [runData, setRunData] = useState(null);

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

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Setting Calculator Charts"
        subtitle="Risultati confronto impostazioni"
        backHref={backHref}
      />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={4}>
          {!runData ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                Nessun risultato disponibile in sessione. Esegui prima il confronto dalla pagina Setting Calculator.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <Heading size="sm">Confronto eseguito</Heading>
                    <Text fontSize="sm" color="gray.700">
                      {runData.leftProduct?.label} vs {runData.rightProduct?.label}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Request ID: {runData.payload?.requestId}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Engine: {runData.response?.engineVersion}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  Pagina grafici predisposta: nel prossimo step colleghiamo qui i grafici pulsation/phases/real milking.
                </AlertDescription>
              </Alert>
            </>
          )}

          <HStack justify="flex-end">
            <Button variant="outline" onClick={() => router.push("/tools/setting-calculator")}>
              Torna agli Input
            </Button>
          </HStack>
        </VStack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
