import { useEffect, useState } from "react";
import {
  Box, Heading, HStack, Button, Select, Input, Stack, Card, CardBody, CardHeader,
  SimpleGrid, Tag, TagLabel, Text, Tooltip, Stat, StatNumber, InputGroup, InputLeftAddon,
  Spinner, useToast
} from "@chakra-ui/react";
import { LuCalculator } from "react-icons/lu";
import { getToken } from "@/lib/auth";
import {
  listProducts, listProductApplications, getProduct,
  createTppRun, computeTppRun, listTppRuns, getTppRunKpis
} from "@/lib/api";

import AppSizePill from "@/components/ui/AppSizePill";

// helpers per visualizzare lo score
const scoreColor = (s) =>
  s >= 4 ? "green.500" :
  s === 3 ? "rgba(120, 224, 116, 1)" :
  s === 2 ? "yellow.500" :
  s === 1 ? "red.500" : "gray.500";

const scoreLabel = (s) =>
  s >= 4 ? "Best" :
  s === 3 ? "Good" :
  s === 2 ? "Fair" :
  s === 1 ? "Poor" : "—";

function TppRow({ pa, product, token, onDone }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(null); // KPI CLOSURE se presente

  // Prefill dall’ultimo run e caricamento KPI se già calcolati
  useEffect(() => {
    if (!token || !pa?.id) return;
    (async () => {
      try {
        const runs = await listTppRuns(token, { product_application_id: pa.id });
        const lastRun = Array.isArray(runs) && runs.length ? runs[0] : null;
        if (lastRun) {
          if (lastRun.real_tpp != null) setValue(String(lastRun.real_tpp));
          try {
            const kpis = await getTppRunKpis(token, lastRun.id);
            const closure = (kpis || []).find((k) => {
              if (k.kpi_code !== "CLOSURE") return false;
              const ctx = k.context_json || "";
              return typeof ctx === "string" && ctx.includes('"agg"') && ctx.includes("final");
            });
            if (closure) setScore(closure.score);
          } catch {
            // nessun KPI computato ancora: ok
          }
        }
      } catch {
        // nessun run salvato: ok
      }
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
      // 1) salva run
      const run = await createTppRun(token, {
        product_application_id: pa.id,
        real_tpp: realVal
      });
      // 2) compute KPI CLOSURE
      const kpis = await computeTppRun(token, run.id);
      const closure = kpis?.find?.(k => k.kpi_code === "CLOSURE");
      if (closure) setScore(closure.score);
      toast({ title: "Saved and Computed", status: "success" });
      onDone?.();
    } catch (err) {
      toast({ title: "Saving/calculation error", description: err?.message, status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const mpDepth = product?.mp_depth_mm ?? null;

  return (
    <Card variant="outline">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <AppSizePill color="blue" size="sm" >{pa.size_mm} mm</AppSizePill>
        </HStack>
      </CardHeader> 
      <CardBody pt="4">
        <Stack spacing={3}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>MP depth (product)</Text>
              <Text>{mpDepth != null ? `${mpDepth} mm` : "-"}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>Real TPP</Text>
              <InputGroup>
                <InputLeftAddon>mm</InputLeftAddon>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter measured Real TPP"
                  isDisabled={saving}
                />
              </InputGroup>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>Closure</Text>
              <Tooltip
                label={score != null ? `Score: ${scoreLabel(score)} (${score}/4)` : "Not computed yet"}
                hasArrow
                placement="top"
              >
                <Stat p={2} borderWidth="1px" borderRadius="md" backgroundColor={scoreColor(score)} textAlign="center">
                  <StatNumber fontSize="l" color="white">
                    {score != null ? score : "—"}
                  </StatNumber>
                </Stat>
              </Tooltip>
            </Box>
          </SimpleGrid>

          <HStack justify="flex-end">
            <Button onClick={onSaveCompute} colorScheme="blue" isLoading={saving} leftIcon={<LuCalculator />}>
              Save & Compute
            </Button>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
}



export default function TppTestPage({ token, pid, product, apps }) {
  if (!pid) {
    return <Box py={8} textAlign="center" color="gray.500">Select a product to start.</Box>;
  }
  const list = Array.isArray(apps) ? apps : [];
  return (
    <Box>
      {list.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {list.map((pa) => (
            <TppRow key={pa.id} pa={pa} product={product} token={token} onDone={() => {}} />
          ))}
        </SimpleGrid>
      ) : (
        <Box py={8} textAlign="center" color="gray.500">No applications for this product.</Box>
      )}
    </Box>
  );
}
