import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormLabel, SimpleGrid, useToast, Badge,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, saveProductPref } from "../lib/api";

export default function ProductsFilters() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);

  // meta per dropdown
  const [meta, setMeta] = useState({ product_types:["liner"], brands:[], models:[], teat_sizes:[], kpis:[] });

  // filtri
  const [productType, setProductType] = useState("liner");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [teatSize, setTeatSize] = useState("");

  // KPI filters: uno attivo + uno “grigio” che diventa attivo col +
  const emptyKpi = { kpi:"", op:">=", value:"" };
  const [kpi1, setKpi1] = useState({ ...emptyKpi });
  const [kpi2, setKpi2] = useState({ ...emptyKpi, disabled:true });

  // preferenze salvate
  const [prefs, setPrefs] = useState([]);
  const [selectedPrefId, setSelectedPrefId] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(()=>window.location.replace("/login"));
    getProductsMeta(t).then(setMeta).catch(()=>{});
    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, []);

  const loadPref = (id) => {
    const p = prefs.find(x=>String(x.id) === String(id));
    if (!p) return;
    const f = p.filters || {};
    setProductType(f.product_type || "liner");
    setBrand(f.brand || ""); setModel(f.model || ""); setTeatSize(f.teat_size || "");
    const kpis = f.kpi || [];
    setKpi1(kpis[0] || { ...emptyKpi });
    if (kpis[1]) setKpi2({ ...kpis[1], disabled:false }); else setKpi2({ ...emptyKpi, disabled:true });
    toast({ status:"info", title:`Caricata preferenza "${p.name}"` });
  };

  const onAddKpi2 = () => setKpi2({ ...emptyKpi, disabled:false });

  const onSavePreset = async () => {
    const name = prompt("Nome della ricerca da salvare:");
    if (!name) return;
    const filters = {
      product_type: productType || undefined,
      brand: brand || undefined,
      model: model || undefined,
      teat_size: teatSize || undefined,
      kpi: [
        ...(kpi1.kpi ? [ {kpi:kpi1.kpi, op:kpi1.op||">=", value: Number(kpi1.value)} ] : []),
        ...(!kpi2.disabled && kpi2.kpi ? [ {kpi:kpi2.kpi, op:kpi2.op||">=", value: Number(kpi2.value)} ] : []),
      ],
    };
    try {
      const t = getToken();
      await saveProductPref(t, name, filters);
      const updated = await listProductPrefs(t);
      setPrefs(updated);
      toast({ status:"success", title:"Preferenza salvata" });
    } catch {
      toast({ status:"error", title:"Errore salvataggio preferenza" });
    }
  };

  const onConfirm = () => {
    const params = new URLSearchParams();
    if (productType) params.set("product_type", productType);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (teatSize) params.set("teat_size", teatSize);
    // passa anche i KPI (li useremo più avanti)
    if (kpi1.kpi) { params.set("kpi1", kpi1.kpi); params.set("op1", kpi1.op||">="); params.set("val1", kpi1.value||""); }
    if (!kpi2.disabled && kpi2.kpi) { params.set("kpi2", kpi2.kpi); params.set("op2", kpi2.op||">="); params.set("val2", kpi2.value||""); }

    router.push(`/products/search?${params.toString()}`);
  };

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      <HStack mb="4" justify="space-between">
        <Button as={NextLink} href="/home" variant="outline" size="sm">← Home</Button>
        <Badge colorScheme={me.role === "admin" ? "purple" : "green"}>{me.role}</Badge>
      </HStack>

      <Heading size="lg" mb="2">Ricerca Prodotti</Heading>
      <Text color="gray.600" mb="6">Seleziona i filtri e conferma per vedere i risultati.</Text>

      <SimpleGrid columns={{ base:1, md:2 }} gap={4}>
        <Box borderWidth="1px" rounded="md" p="4">
          <FormLabel>Tipologia prodotto</FormLabel>
          <Select value={productType} onChange={e=>setProductType(e.target.value)}>
            {(meta.product_types || ["liner"]).map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Box>

        <Box borderWidth="1px" rounded="md" p="4">
          <FormLabel>Brand</FormLabel>
          <Select placeholder="Tutti" value={brand} onChange={e=>setBrand(e.target.value)}>
            {(meta.brands || []).map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Box>

        <Box borderWidth="1px" rounded="md" p="4">
          <FormLabel>Model</FormLabel>
          <Select placeholder="Tutti" value={model} onChange={e=>setModel(e.target.value)}>
            {(meta.models || []).map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Box>

        <Box borderWidth="1px" rounded="md" p="4">
          <FormLabel>Teat Size</FormLabel>
          <Select placeholder="Tutte" value={teatSize} onChange={e=>setTeatSize(e.target.value)}>
            {(meta.teat_sizes || []).map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Box>
      </SimpleGrid>

      {/* KPI filters */}
      <Box mt="6" borderWidth="1px" rounded="md" p="4">
        <FormLabel>KPI Filters</FormLabel>

        <Stack direction={{ base:"column", md:"row" }} gap="3" align="center" mb="3">
          <Select placeholder="KPI" value={kpi1.kpi} onChange={e=>setKpi1(s=>({...s, kpi:e.target.value}))} maxW="240px">
            {(meta.kpis || []).map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Select value={kpi1.op} onChange={e=>setKpi1(s=>({...s, op:e.target.value}))} maxW="120px">
            <option value=">=">{">="}</option>
            <option value="<=">{"<="}</option>
            <option value=">">{">"}</option>
            <option value="<">{"<"}</option>
            <option value="=">{"="}</option>
          </Select>
          <Input type="number" placeholder="valore" value={kpi1.value} onChange={e=>setKpi1(s=>({...s, value:e.target.value}))} maxW="160px"/>
          <IconButton aria-label="Aggiungi KPI" icon={<AddIcon />} onClick={onAddKpi2} title="Aggiungi un secondo KPI" />
        </Stack>

        <Stack direction={{ base:"column", md:"row" }} gap="3" align="center" opacity={kpi2.disabled ? 0.5 : 1}>
          <Select placeholder="KPI 2 (opzionale)" value={kpi2.kpi} onChange={e=>setKpi2(s=>({...s, kpi:e.target.value}))} maxW="240px" isDisabled={kpi2.disabled}>
            {(meta.kpis || []).map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Select value={kpi2.op} onChange={e=>setKpi2(s=>({...s, op:e.target.value}))} maxW="120px" isDisabled={kpi2.disabled}>
            <option value=">=">{">="}</option>
            <option value="<=">{"<="}</option>
            <option value=">">{">"}</option>
            <option value="<">{"<"}</option>
            <option value="=">{"="}</option>
          </Select>
          <Input type="number" placeholder="valore" value={kpi2.value} onChange={e=>setKpi2(s=>({...s, value:e.target.value}))} maxW="160px" isDisabled={kpi2.disabled}/>
          <Text color="gray.500" display={{ base:"none", md:"block" }}>
            (finché non aggiungi, non è un filtro)
          </Text>
        </Stack>
      </Box>

      {/* Preferenze salvate */}
      <Box mt="6" borderWidth="1px" rounded="md" p="4">
        <HStack justify="space-between" mb="3">
          <Text fontWeight="bold">Preference Research</Text>
          <Button size="sm" onClick={onSavePreset}>Salva come preset</Button>
        </HStack>
        <HStack gap="3">
          <Select placeholder="Seleziona un preset" value={selectedPrefId} onChange={e=>setSelectedPrefId(e.target.value)} maxW="320px">
            {prefs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Button size="sm" onClick={()=>loadPref(selectedPrefId)} isDisabled={!selectedPrefId}>Carica</Button>
        </HStack>
      </Box>

      <HStack mt="6" justify="flex-end">
        <Button colorScheme="blue" onClick={onConfirm}>Confirm</Button>
      </HStack>
    </Box>
  );
}

