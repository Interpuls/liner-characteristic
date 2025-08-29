// pages/admin/products.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormControl, FormLabel, SimpleGrid, useToast, Divider, Card, CardBody, CardHeader,
  Tag, TagLabel, Show, Hide, VStack, InputGroup, InputLeftElement, CloseButton,
  Spinner, Icon, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton
} from "@chakra-ui/react";
import { AddIcon, SearchIcon, ArrowBackIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { LuShoppingCart } from "react-icons/lu";
import { getToken } from "../../lib/auth";
import { getMe, getProductsMeta, listProductPrefs } from "../../lib/api";
import { listProducts } from "../../lib/api"; 
import ProductModal from "../../components/ProductModal";


function ProductCard({ p }) {
  return (
    <Card variant="outline">
      <Heading size="sm">
        {(p.name ?? `${p.brand ?? ""} ${p.model ?? ""}`.trim()) || "Product"}
      </Heading>

      <CardBody pt="0">
        <VStack align="start" spacing="1">
          {p.product_type && <Tag size="sm" variant="subtle"><TagLabel>{p.product_type}</TagLabel></Tag>}
          {p.brand && <Text fontSize="sm" color="gray.600">Brand: {p.brand}</Text>}
          {p.model && <Text fontSize="sm" color="gray.600">Model: {p.model}</Text>}
          {p.teat_size && <Text fontSize="sm" color="gray.600">Teat size: {p.teat_size}</Text>}
          {p.kpis?.length > 0 && <Text fontSize="sm" color="gray.600">KPIs: {p.kpis.length}</Text>}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default function AdminProducts() {
  const toast = useToast();
  const router = useRouter();

  //modale crea prodotto
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newProduct, setNewProduct] = useState({
  name: "",
  product_type: "",
  brand: "",
  model: "",
  teat_size: "",
});


  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ product_types:["liner"], brands:[], models:[], teat_sizes:[], kpis:[] });
  const [prefs, setPrefs] = useState([]);

  // filtri base
  const [productType, setProductType] = useState("liner");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [teatSize, setTeatSize] = useState("");

  // ricerca + risultati
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // build params per API
  const params = useMemo(() => {
    const p = {};
    if (productType) p.product_type = productType;
    if (brand) p.brand = brand;
    if (model) p.model = model;
    if (teatSize) p.teat_size = teatSize;
    if (search.trim()) p.q = search.trim();            
    return p;
  }, [productType, brand, model, teatSize, search]);

  // fetch prodotti
  const fetchProducts = async () => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    try {
      setLoading(true);
      const res = await listProducts(t, params);
      setProducts(res?.items ?? res ?? []); 
    } catch (err) {
      console.error(err);
      toast({
        title: "Errore caricamento prodotti",
        description: err?.message ?? "Impossibile caricare l'elenco",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // bootstrap
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(()=>window.location.replace("/login"));
    getProductsMeta(t).then(setMeta).catch(()=>{});
    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, []);

  // refetch con debounce su search/filtri
  useEffect(() => {
    if (!me) return;
    const id = setTimeout(fetchProducts, 350); 
    return () => clearTimeout(id);
  }, [me, params]);

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      {/* Header */}
      <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "flex-start", md: "center" }} mb={4} gap={3}>
        <HStack gap={3}>
          <Hide below="md">
            <Button as={NextLink} href="/home" variant="outline" size="sm" leftIcon={<ChevronLeftIcon />}>
              Home
            </Button>
          </Hide>
          <Show below="md">
            <IconButton
              as={NextLink}
              href="/home"
              variant="outline"
              size="sm"
              aria-label="Home"
              icon={<ChevronLeftIcon />}
            />
          </Show>
          <Heading size="lg">Parco Prodotti</Heading>
        </HStack>
      </Stack>

      {/* Search bar */}
      <HStack align="center" spacing={3}>
+        <InputGroup flex="1">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Cerca per nome, brand, modello…"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            variant="filled"
          />
          {search && (
            <CloseButton ml={2} onClick={()=>setSearch("")} alignSelf="center" />
          )}
        </InputGroup>
        <Hide below="md">
          <Button colorScheme="green" onClick={onOpen} leftIcon={<AddIcon />}>
            New Product
          </Button>
        </Hide>
        <Show below="md">
          <IconButton
            colorScheme="green"
            onClick={onOpen}
            aria-label="New Product"
            icon={<AddIcon />}
          />
        </Show>
      </HStack>

      {/* Risultati */}
      <Box mt={8} minH="200px">
        {loading ? (
          <HStack justify="center" py={12}><Spinner /></HStack>
        ) : products?.length ? (
          <SimpleGrid columns={{ base:1, sm:2, md:3 }} gap={4}>
            {products.map((p) => <ProductCard key={p.id ?? `${p.brand}-${p.model}-${Math.random()}`} p={p} />)}
          </SimpleGrid>
        ) : (
          <Center py={12}>
            <Box textAlign="center">
              <Icon as={LuShoppingCart} boxSize={10} mb={3} />
              <Heading size="md" mb={1}>Nessun prodotto trovato</Heading>
              <Text color="gray.600">
                Modifica la ricerca o crea un nuovo prodotto.
              </Text>
            </Box>
          </Center>
        )}
      </Box>
      <ProductModal
        isOpen={isOpen}
        onClose={onClose}
        meta={meta}
        onSave={(prod) => {
          console.log("Nuovo prodotto:", prod);
        }}
      />
    </Box>
  );
}
