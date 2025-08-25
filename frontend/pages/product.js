import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormControl, FormLabel, FormHelperText, SimpleGrid, useToast, Divider,
  Card, CardHeader, CardBody, InputGroup, InputRightElement, Tag, TagLabel,
} from "@chakra-ui/react";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, saveProductPref } from "../lib/api";

export default function ProductsFilters() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ product_types:["liner"], brands:[], models:[], teat_sizes:[], kpis:[] });

  // filtri base
  const [productType, setProductType] = useState("liner");
  const [brand, setBrand]   = useState("");
  const [model, setModel]   = useState("");
  const [teatSize, setTeatSize] = useState("");

  // KPI multipli (array di oggetti {code, op, value})
  const [kpiFilters, setKpiFilters] = useState([]);

  // preferenze
  const [prefs, setPrefs] = useState([]);
  const [presetName, setPresetName] = useState("");
  const [selectedPrefId, setSelectedPrefId] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(()=>window.location.replace("/login"));
    // meta include già i KPI dal backend
    getProductsMeta(t).then(setMeta).catch(()=>{});
    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, []);

  const kpiChoices = useMemo(() => meta.kpis || [], [meta.kpis]);

  const addKpi = () => {
    setKpiFilters((prev) => [...prev, { code:"", op:">=", value:"" }]);
  };

  const removeKpi = (idx) => {
    setKpiFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateKpi = (idx, patch) => {
    setKpiFilters((prev) => prev.map((k, i) => i === idx ? { ...k, ...patch } : k));
  };

  const onSavePreset = async () => {
    const name = presetName.trim();
    if (!name) { toast({status:"warning", title:"Inserisci un nome preset"}); return; }
    const filters = {
      product_type: productType || undefined,
      brand: brand || undefined,
      model: model || undefined,
      teat_size: teatSize || undefined,
      kpi: kpiFilters
        .filter(k => k.code && k.value !== "")
        .map(k => ({ kpi: k.code, op: k.op || ">=", value: Number(k.value) })),
    };
    try {
      const t = getToken();
      await saveProductPref(t, name, filters);
      const updated = await listProductPrefs(t);
      setPrefs(updated);
      setPresetName("");
      toast({ status:"success", title:"Preferenza salvata" });
    } catch {
      toast({ status:"error", title:"Errore salvataggio preferenza" });
    }
  };

  const loadPref = () => {
    const p = prefs.find(x => String(x.id) === String(selectedPrefId));
    if (!p) return;
    const f = p.filters || {};
    setProductType(f.product_type || "liner");
    setBrand(f.brand || ""); setModel(f.model || ""); setTeatSize(f.teat_size || "");
    const kpis = Array.isArray(f.kpi) ? f.kpi : [];
    setKpiFilters(kpis.map(k => ({ code:k.kpi, op:k.op || ">=", value:String(k.value ?? "") })));
    toast({ status:"info", title:`Caricata preferenza "${p.name}"` });
  };

  const onConfirm = () => {
    const params = new URLSearchParams();
    if (productType) params.set("product_type", productType);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (teatSize) params.set("teat_size", teatSize);
    // KPI in query (verranno usati nella pagina /products/search, implementeremo dopo)
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
      <HStack mb="4" justify="space-between">
        <Button as={NextLink} href="/home" variant="outline" size="sm">← Home</Button>
        {/* tag ruolo rimosso come richiesto */}
      </HStack>

      <Heading size="lg" mb="2">Ricerca Prodotti</Heading>
      <Text color="gray.600" mb="6">Seleziona i filtri e conferma per vedere i risultati.</Text>

      {/* Filtri base in Cards */}
      <SimpleGrid columns={{ base:1, md:2 }} gap={4}>
        <Card>
          <CardHeader py="3"><Heading size="sm">Tipologia prodotto</Heading></CardHeader>
          <CardBody pt="0">
            <FormControl>
              <FormLabel>Tipo</FormLabel>
              <Select value={productType} onChange={e=>setProductType(e.target.value)} size="md" variant="filled">
                {(meta.product_types || ["liner"]).map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
              <FormHelperText>Predefinito: liner</FormHelperText>
            </FormControl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader py="3"><Heading size="sm">Brand</Heading></CardHeader>
          <CardBody pt="0">
            <FormControl>
              <FormLabel>Brand</FormLabel>
              <Select placeholder="Tutti" value={brand} onChange={e=>setBrand(e.target.value)} size="md" variant="filled">
                {(meta.brands || []).map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </FormControl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader py="3"><Heading size="sm">Model</Heading></CardHeader>
          <CardBody pt="0">
            <FormControl>
              <FormLabel>Modello</FormLabel>
              <Select placeholder="Tutti" value={model} onChange={e=>setModel(e.target.value)} size="md" variant="filled">
                {(meta.models || []).map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </FormControl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader py="3"><Heading size="sm">Teat Size</Heading></CardHeader>
          <CardBody pt="0">
            <FormControl>
              <FormLabel>Teat Size</FormLabel>
              <Select placeholder="Tutte" value={teatSize} onChange={e=>setTeatSize(e.target.value)} size="md" variant="filled">
                {(meta.teat_sizes || []).map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </FormControl>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Divider my="6" />

      {/* KPI multipli */}
      <Card>
        <CardHeader py="3">
          <HStack justify="space-between">
            <Heading size="sm">Filtri KPI</Heading>
            <Tag size="sm" variant="subtle"><TagLabel>{kpiFilters.length} selezionati</TagLabel></Tag>
          </HStack>
        </CardHeader>
        <CardBody pt="0">
          <Stack gap="3">
            {kpiFilters.map((k, idx) => (
              <HStack key={idx} gap="3" align="center" flexWrap="wrap">
                <FormControl maxW="280px">
                  <FormLabel mb="1">KPI</FormLabel>
                  <Select
                    placeholder="Seleziona KPI"
                    value={k.code}
                    onChange={e=>updateKpi(idx, { code:e.target.value })}
                    size="md"
                    variant="filled"
                  >
                    {kpiChoices.map(kp => (
                      <option key={kp.id} value={kp.code}>
                        {kp.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl maxW="140px">
                  <FormLabel mb="1">Operatore</FormLabel>
                  <Select value={k.op} onChange={e=>updateKpi(idx, { op:e.target.value })} size="md" variant="filled">
                    <option value=">=">{">="}</option>
                    <option value="<=">{"<="}</option>
                    <option value=">">{">"}</option>
                    <option value="<">{"<"}</option>
                    <option value="=">{"="}</option>
                  </Select>
                </FormControl>

                <FormControl maxW="180px">
                  <FormLabel mb="1">Valore</FormLabel>
                  <Input type="number"
                    value={k.value}
                    onChange={e=>updateKpi(idx, { value:e.target.value })}
                    placeholder="es. 10"
                    size="md" variant="filled"
                  />
                </FormControl>

                <IconButton aria-label="Rimuovi KPI"
                  icon={<MinusIcon />}
                  onClick={()=>removeKpi(idx)}
                  variant="outline"
                  size="sm"
                />
              </HStack>
            ))}

            <HStack>
              <IconButton aria-label="Aggiungi KPI" icon={<AddIcon />} onClick={addKpi} size="sm" />
              <Text color="gray.500" fontSize="sm">Aggiungi un altro KPI alla ricerca</Text>
            </HStack>
          </Stack>
        </CardBody>
      </Card>

      <Divider my="6" />

      {/* Preferences compattate (niente badge admin) */}
      <Card>
        <CardHeader py="3"><Heading size="sm">Preference Research</Heading></CardHeader>
        <CardBody pt="0">
          <Stack gap="3">
            <HStack gap="3" flexWrap="wrap">
              <FormControl maxW="320px">
                <FormLabel mb="1">Nome preset</FormLabel>
                <InputGroup>
                  <Input placeholder="es. Liner EU grandi + MI≥3" value={presetName} onChange={e=>setPresetName(e.target.value)} variant="filled" />
                  <InputRightElement width="auto" pr="2">
                    <Button size="sm" onClick={onSavePreset} colorScheme="blue">Salva</Button>
                  </InputRightElement>
                </InputGroup>
                <FormHelperText>Salva i filtri attuali con un nome.</FormHelperText>
              </FormControl>

              <FormControl maxW="320px">
                <FormLabel mb="1">Preset salvati</FormLabel>
                <HStack>
                  <Select placeholder="Seleziona" value={selectedPrefId} onChange={e=>setSelectedPrefId(e.target.value)} variant="filled">
                    {prefs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Button size="sm" onClick={loadPref} isDisabled={!selectedPrefId}>Carica</Button>
                </HStack>
              </FormControl>
            </HStack>
          </Stack>
        </CardBody>
      </Card>

      <HStack mt="6" justify="flex-end">
        <Button colorScheme="blue" onClick={onConfirm}>Confirm</Button>
      </HStack>
    </Box>
  );
}