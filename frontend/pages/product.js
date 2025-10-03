// pages/products.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormControl, FormLabel, SimpleGrid, useToast, Divider, Card, CardBody, CardHeader,
  Tag, TagLabel, Show
} from "@chakra-ui/react";
import { AddIcon, MinusIcon, StarIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs } from "../lib/api";

import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

export default function Products() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ brands:[], models:[], teat_sizes:[], kpis:[] });
  const [prefs, setPrefs] = useState([]);

  // filtri base (senza productType)
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [teatSize, setTeatSize] = useState("");

  // KPI multipli: solo code
  const [kpiFilters, setKpiFilters] = useState([]);
  const kpiChoices = useMemo(() => meta.kpis || [], [meta.kpis]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(() => {
      toast({ status: "error", title: "Sessione scaduta" });
      window.location.replace("/login");
    });
    getProductsMeta(t).then(setMeta).catch(()=>{});
    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, [toast]);

  // KPI handlers: solo code
  const addKpi = () => setKpiFilters((prev) => [...prev, { code:"" }]);
  const removeKpi = (i) => setKpiFilters((prev) => prev.filter((_, idx) => idx !== i));
  const updateKpi = (i, patch) => setKpiFilters((prev) => prev.map((k, idx) => idx === i ? { ...k, ...patch } : k));

  const onConfirm = () => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (teatSize) params.set("teat_size", teatSize);

    // Solo KPI code -> kpi1, kpi2, ... (niente op/val per non toccare il backend dei filtri numerici)
    kpiFilters.forEach((k, i) => {
      if (k.code) {
        params.set(`kpi${i+1}`, k.code);
      }
    });

    router.push(`/product/result?${params.toString()}`);
  };

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <>
      {/* Header: back → Home  */}
      <AppHeader
        title="Liner Search"
        backHref="/home"
      />

      <Box as="main" maxW="6xl" mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        {/* CardHeader: SOLO Preference research */}
        <Card mb={4} variant="outline" borderColor="gray.200" overflow="hidden">
          <CardHeader bg="#12305f" color="white" py={{ base:3, md:4 }}>
            <HStack gap={2} w={{ base:"full", md:"auto" }}>
              <StarIcon boxSize={4} />
              <Select
                placeholder="Preference research"
                size="sm"
                variant="filled"
                w={{ base:"full", md:"320px" }}
                bg="white"
                color="black"
              >
                {prefs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </HStack>
          </CardHeader>
        </Card>

        <Text color="gray.600" mb={4}>Seleziona i filtri e conferma per vedere i risultati.</Text>

        {/* Riquadro Filters */}
        <Card>
          <CardHeader py="3"><Heading size="sm">Filters</Heading></CardHeader>
          <CardBody pt="0">
            {/* colonne: brand/model/teat_size (rimosso product_type) */}
            <SimpleGrid columns={{ base:1, md:2, lg:3 }} gap={4} mb={4}>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.500" mb={1}>Brand</FormLabel>
                <Select placeholder="Tutti" value={brand} onChange={e=>setBrand(e.target.value)} variant="filled" size="md">
                  {(meta.brands || []).map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" color="gray.500" mb={1}>Model</FormLabel>
                <Select placeholder="Tutti" value={model} onChange={e=>setModel(e.target.value)} variant="filled" size="md">
                  {(meta.models || []).map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" color="gray.500" mb={1}>Teat size</FormLabel>
                <Select placeholder="Tutte" value={teatSize} onChange={e=>setTeatSize(e.target.value)} variant="filled" size="md">
                  {(meta.teat_sizes || []).map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormControl>
            </SimpleGrid>

            <Divider my={4} />

            {/* KPI multipli: solo selezione KPI */}
            <Stack gap={3}>
              <HStack justify="space-between">
                <Heading size="sm">KPI</Heading>
                <Tag size="sm" variant="subtle"><TagLabel>{kpiFilters.length} selezionati</TagLabel></Tag>
              </HStack>

              {kpiFilters.map((k, idx) => (
                <SimpleGrid key={idx} columns={{ base:1, md:2 }} gap={3} alignItems="end">
                  <FormControl>
                    <FormLabel fontSize="sm" color="gray.500" mb={1}>KPI</FormLabel>
                    <Select
                      placeholder="Seleziona KPI"
                      value={k.code}
                      onChange={e=>updateKpi(idx, { code:e.target.value })}
                      variant="filled"
                    >
                      {kpiChoices.map(kp => (
                        <option key={kp.id} value={kp.code}>{kp.name}</option>
                      ))}
                    </Select>
                  </FormControl>

                  <HStack justify={{ base:"flex-end", md:"flex-start" }}>
                    <IconButton aria-label="Rimuovi KPI" icon={<MinusIcon />} onClick={()=>removeKpi(idx)} variant="outline" size="sm" />
                  </HStack>
                </SimpleGrid>
              ))}

              <HStack>
                <IconButton aria-label="Aggiungi KPI" icon={<AddIcon />} onClick={addKpi} size="sm" />
                <Text color="gray.500" fontSize="sm">Aggiungi un KPI</Text>
              </HStack>
            </Stack>
          </CardBody>
        </Card>

        <HStack mt={6} justify="center">
          <Button colorScheme="blue" onClick={onConfirm}>Confirm</Button>
        </HStack>

        {/* Mobile: nessun logout in questa pagina */}
        <Show below="md">
          {/* niente */}
        </Show>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </>
  );
}
