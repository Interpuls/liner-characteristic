// pages/products.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormControl, FormLabel, SimpleGrid, useToast, Divider, Card, CardBody, CardHeader,
  Tag, TagLabel, Show, Hide
} from "@chakra-ui/react";
import { AddIcon, MinusIcon, StarIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs } from "../lib/api";

export default function Products() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ product_types:["liner"], brands:[], models:[], teat_sizes:[], kpis:[] });
  const [prefs, setPrefs] = useState([]);

  // filtri base
  const [productType, setProductType] = useState("liner");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [teatSize, setTeatSize] = useState("");

  // KPI multipli
  const [kpiFilters, setKpiFilters] = useState([]);
  const kpiChoices = useMemo(() => meta.kpis || [], [meta.kpis]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(()=>window.location.replace("/login"));
    getProductsMeta(t).then(setMeta).catch(()=>{});
    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, []);

  const addKpi = () => setKpiFilters((prev) => [...prev, { code:"", op:">=", value:"" }]);
  const removeKpi = (i) => setKpiFilters((prev) => prev.filter((_, idx) => idx !== i));
  const updateKpi = (i, patch) => setKpiFilters((prev) => prev.map((k, idx) => idx === i ? { ...k, ...patch } : k));

  const onConfirm = () => {
    const params = new URLSearchParams();
    if (productType) params.set("product_type", productType);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (teatSize) params.set("teat_size", teatSize);
    kpiFilters.forEach((k, i) => {
      if (k.code && k.value !== "") {
        params.set(`kpi${i+1}`, k.code);
        params.set(`op${i+1}`, k.op || ">=");
        params.set(`val${i+1}`, String(k.value));
      }
    });
    router.push(`/products/search?${params.toString()}`);
  };

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      {/* Header: titolo + preference research */}
      <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "flex-start", md: "center" }} mb={4} gap={3}>
        <HStack gap={3}>
          <Button as={NextLink} href="/home" variant="outline" size="sm">← Home</Button>
          <Heading size="lg">Ricerca Prodotti</Heading>
        </HStack>

        {/* Preference research (icona stella + select) */}
        <HStack gap={2} w={{ base:"full", md:"auto" }}>
          <StarIcon boxSize={4} color="yellow.400" />
          <Select placeholder="Preference research" size="sm" variant="filled" w={{ base:"full", md:"260px" }}>
            {prefs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </HStack>
      </Stack>

      <Text color="gray.600" mb={4}>Seleziona i filtri e conferma per vedere i risultati.</Text>

      {/* UNICO riquadro filters */}
      <Card>
        <CardHeader py="3"><Heading size="sm">Filters</Heading></CardHeader>
        <CardBody pt="0">
          {/* filtri base in una griglia compatta */}
          <SimpleGrid columns={{ base:1, md:2, lg:4 }} gap={4} mb={4}>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.500" mb={1}>Tipologia prodotto</FormLabel>
              <Select value={productType} onChange={e=>setProductType(e.target.value)} variant="filled" size="md">
                {(meta.product_types || ["liner"]).map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </FormControl>

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
          
          {/* KPI multipli compatti */}
          <Stack gap={3}>
            <HStack justify="space-between">
              <Heading size="sm">Filtri KPI</Heading>
              <Tag size="sm" variant="subtle"><TagLabel>{kpiFilters.length} selezionati</TagLabel></Tag>
            </HStack>

            {kpiFilters.map((k, idx) => (
              <SimpleGrid key={idx} columns={{ base:1, md:4 }} gap={3} alignItems="end">
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

                <FormControl maxW={{ md:"140px" }}>
                  <FormLabel fontSize="sm" color="gray.500" mb={1}>Operatore</FormLabel>
                  <Select value={k.op} onChange={e=>updateKpi(idx, { op:e.target.value })} variant="filled">
                    <option value=">=">{">="}</option>
                    <option value="<=">{"<="}</option>
                    <option value=">">{">"}</option>
                    <option value="<">{"<"}</option>
                    <option value="=">{"="}</option>
                  </Select>
                </FormControl>

                <FormControl maxW={{ md:"180px" }}>
                  <FormLabel fontSize="sm" color="gray.500" mb={1}>Valore</FormLabel>
                  <Input type="number" value={k.value} onChange={e=>updateKpi(idx, { value:e.target.value })} placeholder="es. 10" variant="filled" />
                </FormControl>

                <HStack justify={{ base:"flex-end", md:"flex-start" }}>
                  <IconButton aria-label="Rimuovi KPI" icon={<MinusIcon />} onClick={()=>removeKpi(idx)} variant="outline" size="sm" />
                </HStack>
              </SimpleGrid>
            ))}

            <HStack>
              <IconButton aria-label="Aggiungi KPI" icon={<AddIcon />} onClick={addKpi} size="sm" />
              <Text color="gray.500" fontSize="sm">Aggiungi un altro KPI</Text>
            </HStack>
          </Stack>
        </CardBody>
      </Card>

      <HStack mt={6} justify="flex-end">
        <Button colorScheme="blue" onClick={onConfirm}>Confirm</Button>
      </HStack>
    </Box>
  );
}