import { useEffect, useState } from "react";
import {
  Box, HStack, Button, Input, Stack, Card, CardBody, CardHeader,
  SimpleGrid, Tag, TagLabel, Text, Tooltip, Stat, StatNumber,
  InputGroup, InputLeftAddon, Spinner, useToast, Heading
} from "@chakra-ui/react";
import { LuCalculator } from "react-icons/lu";
import {
  createSpeedRun, computeSpeedRun, listSpeedRuns, getSpeedRunKpis
} from "@/lib/api";

const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "green.400" :
  s === 2 ? "yellow.500" :
  s === 1 ? "red.500" : "gray.500";

const scoreLabel = (s) =>
  s >= 4 ? "Best" :
  s === 3 ? "Good" :
  s === 2 ? "Fair" :
  s === 1 ? "Poor" : "—";

function SpeedRow({ pa, product, token, onDone }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!token || !pa?.id) return;
    (async () => {
      try {
        const runs = await listSpeedRuns(token, { product_application_id: pa.id });
        const lastRun = Array.isArray(runs) && runs.length ? runs[0] : null;
        if (lastRun) {
          if (lastRun.measure_ml != null) setValue(String(lastRun.measure_ml));
          try {
            const kpis = await getSpeedRunKpis(token, lastRun.id);
            const speed = (kpis || []).find((k) => {
              if (k.kpi_code !== "SPEED") return false;
              const ctx = k.context_json || "";
              return typeof ctx === "string" && ctx.includes('"agg"') && ctx.includes("final");
            });
            if (speed) setScore(speed.score);
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();
  }, [token, pa?.id]);

  const onSaveCompute = async () => {
    const realVal = parseFloat(String(value).replace(",", "."));
    if (Number.isNaN(realVal)) {
      toast({ title: "Inserisci un numero valido", status: "warning" });
      return;
    }
    try {
      setSaving(true);
      const run = await createSpeedRun(token, {
        product_application_id: pa.id,
        measure_ml: realVal
      });
      const kpis = await computeSpeedRun(token, run.id);
      const speed = kpis?.find?.(k => k.kpi_code === "SPEED");
      if (speed) setScore(speed.score);
      toast({ title: "Salvato e calcolato", status: "success" });
      onDone?.();
    } catch (err) {
      toast({ title: "Errore salvataggio/calcolo", description: err?.message, status: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outline">
      <CardHeader pb="2">
        <HStack justify="space-between">
          <HStack>
            <Heading size="sm">{product?.model ?? "Model"}</Heading>
            <Tag size="sm" variant="subtle"><TagLabel>{product?.brand ?? "-"}</TagLabel></Tag>
          </HStack>
          <Tag size="sm" colorScheme="purple"><TagLabel>{pa.size_mm} mm</TagLabel></Tag>
        </HStack>
      </CardHeader>
      <CardBody pt="0">
        <Stack spacing={3}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>Product</Text>
              <Text>{product?.brand ? `${product.brand} ${product.model ?? ""}`.trim() : (product?.model ?? "-")}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>Measure</Text>
              <InputGroup>
                <InputLeftAddon>ml</InputLeftAddon>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter measured Speed (ml)"
                  isDisabled={saving}
                />
              </InputGroup>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>SPEED score</Text>
              <Tooltip
                label={score != null ? `Score: ${scoreLabel(score)} (${score}/4)` : "Not computed yet"}
                hasArrow
                placement="top"
              >
                <Stat p={2} borderWidth="1px" borderRadius="md" bgColor={scoreColor(score)} textAlign="center">
                  <StatNumber fontSize="l" color="white">
                    {score != null ? score : "—"}
                  </StatNumber>
                </Stat>
              </Tooltip>
            </Box>
          </SimpleGrid>

          <HStack justify="flex-end">
            <Button onClick={onSaveCompute} colorScheme="purple" isLoading={saving} leftIcon={<LuCalculator />}>
              Save & Compute
            </Button>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
}

export default function SpeedTestPage({ token, pid, product, apps }) {
  if (!pid) return <Box py={8} textAlign="center" color="gray.500">Select a product to start.</Box>;

  const list = Array.isArray(apps) ? apps : [];
  if (!list.length) return <Box py={8} textAlign="center" color="gray.500">No applications for this product.</Box>;

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      {list.map((pa) => (
        <SpeedRow
          key={pa.id}
          pa={pa}
          product={product}
          token={token}
          onDone={() => {}}
        />
      ))}
    </SimpleGrid>
  );
}
