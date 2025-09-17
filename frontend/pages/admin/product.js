// pages/admin/products.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, 
  FormControl, FormLabel, SimpleGrid, useToast, Divider, Card, CardBody, CardHeader,
  Tag, TagLabel, Show, Hide, VStack, InputGroup, InputLeftElement, CloseButton,
  Spinner, Icon, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Tooltip, Menu, MenuButton, MenuList, MenuItem, Grid, InputRightElement
} from "@chakra-ui/react";
import { AddIcon, SearchIcon, ChevronLeftIcon, ArrowUpDownIcon, CheckIcon, IconButton, CloseIcon  } from "@chakra-ui/icons";
import { LuShoppingCart } from "react-icons/lu";
import { getToken } from "../../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, createProduct  } from "../../lib/api";
import { listProducts, deleteProduct, updateProduct  } from "../../lib/api"; 
import ProductModal from "../../components/ProductModal";
import ProductEditModal from "../../components/ProductEditModal";
import ProductCard from "../../components/ProductCard";
import ProductDetailModal from "../../components/ProductDetailModal";




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

  // modale edit prodotto
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editing, setEditing] = useState(null);

  const openEdit = (prod) => { setEditing(prod); onEditOpen(); };

  // modale dettaglio prodotto
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [detailProd, setDetailProd] = useState(null);

  const openDetail = (p) => { setDetailProd(p); onDetailOpen(); };


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

// products === null => primo loading; poi array
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest | brand_asc | brand_desc | model_asc | model_desc
  // stato di saving

  // filtro per prodotti (search + filtri base)
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const arr = [...products];
    const safeStr = (v) => (v ?? "").toString().toLowerCase();
    switch (sortBy) {
      case "brand_asc":  arr.sort((a,b)=>safeStr(a.brand).localeCompare(safeStr(b.brand))); break;
      case "brand_desc": arr.sort((a,b)=>safeStr(b.brand).localeCompare(safeStr(a.brand))); break;
      case "model_asc":  arr.sort((a,b)=>safeStr(a.model||a.name).localeCompare(safeStr(b.model||b.name))); break;
      case "model_desc": arr.sort((a,b)=>safeStr(b.model||b.name).localeCompare(safeStr(a.model||a.name))); break;
      case "newest":
      default:
        // proxy “più recente”: id più alto prima (fallback se manca created_at)
        arr.sort((a,b)=>(b.id??0)-(a.id??0));
    }
    return arr;
  }, [products, sortBy]);

  const [saving, setSaving] = useState(false);

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
          <Heading size="lg">Manage Products</Heading>
        </HStack>
      </Stack>


      {/* Search + Sort + New Product */}
      <Grid
        templateColumns="1fr auto auto"
        gap={2}
        alignItems="center"
      >
        {/* Search */}
        <InputGroup minW={0}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>

          <Input
            placeholder="Search by brand or model…"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            variant="filled"
            w="100%"
            minW={0}           // evita overflow su mobile
          />

          {search && (
            <InputRightElement width="auto">
              <IconButton
                aria-label="Clear search"
                size="sm"
                variant="ghost"
                icon={<CloseIcon boxSize={3} />}
                onClick={()=>setSearch("")}
              />
            </InputRightElement>
          )}
        </InputGroup>
        
        {/* Sort control */}
        <Menu>
          <Tooltip
            label={`Sort: ${
              sortBy === "newest" ? "Newest" :
              sortBy === "brand_asc" ? "Brand A → Z" :
              sortBy === "brand_desc" ? "Brand Z → A" :
              sortBy === "model_asc" ? "Model A → Z" : "Model Z → A"
            }`}
            openDelay={400}
          >
            <MenuButton
              as={IconButton}
              aria-label="Sort"
              icon={<ArrowUpDownIcon />}
              variant="ghost"
              size="md"
            />
          </Tooltip>
          <MenuList>
            <MenuItem onClick={() => setSortBy("newest")}>
              Newest {sortBy === "newest" && <CheckIcon ml="auto" />}
            </MenuItem>
            <MenuItem onClick={() => setSortBy("brand_asc")}>
              Brand A → Z {sortBy === "brand_asc" && <CheckIcon ml="auto" />}
            </MenuItem>
            <MenuItem onClick={() => setSortBy("brand_desc")}>
              Brand Z → A {sortBy === "brand_desc" && <CheckIcon ml="auto" />}
            </MenuItem>
            <MenuItem onClick={() => setSortBy("model_asc")}>
              Model A → Z {sortBy === "model_asc" && <CheckIcon ml="auto" />}
            </MenuItem>
            <MenuItem onClick={() => setSortBy("model_desc")}>
              Model Z → A {sortBy === "model_desc" && <CheckIcon ml="auto" />}
            </MenuItem>
          </MenuList>
        </Menu>
          
        {/* New Product */}
        <Button
          colorScheme="green"
          onClick={onOpen}
          leftIcon={<AddIcon />}
          size="sm"
          justifySelf="end"
          px={{ base: 2, md: 4 }}
        >
          <Box display={{ base: "none", sm: "inline" }}>New Product</Box>
        </Button>
      </Grid>

      {/* Risultati */}
      <Box mt={8} minH="200px">
        {/* Primo caricamento */}
        {products === null ? (
          <Center py={16}>
            <VStack spacing={3}>
              <Spinner size="xl" />
              <Text color="gray.600">Loading products…</Text>
            </VStack>
          </Center>
        ) : loading ? (
          // ricarichi con filtri/ricerca → spinner semplice
          <Center py={12}><Spinner /></Center>
        ) : sortedProducts.length > 0 ? (
          <SimpleGrid columns={{ base:1, sm:2, md:3 }} gap={4}>
            {sortedProducts.map((p) => (
              <ProductCard
                key={p.id ?? `${p.brand}-${p.model}-${Math.random()}`}
                p={p}
                onEdit={openEdit}
                onDetail={openDetail}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Center py={12}>
            <Box textAlign="center">
              <Icon as={LuShoppingCart} boxSize={10} mb={3} />
              <Heading size="md" mb={1}>No products found</Heading>
              <Text color="gray.600">
                Try adjusting your search or create a new product.
              </Text>
            </Box>
          </Center>
        )}
      </Box>

      <ProductModal
        isOpen={isOpen}
        onClose={onClose}
        meta={meta}
        onSave={async (prod) => {
          const t = getToken();
          try {
            await createProduct(t, prod);
            toast({ title: "Product created", status: "success" });
            fetchProducts(); // ricarica la lista
          } catch (e) {
            const msg = e?.message || "Create failed";
            toast({ title: "Create failed", description: msg, status: "error" });
          }
        }}
      />
      <ProductEditModal
        isOpen={isEditOpen}
        onClose={() => { onEditClose(); setEditing(null); }}
        meta={meta}
        product={editing}
        onSave={async (id, patch) => {
          const t = getToken();
          try {
            await updateProduct(t, id, patch);
            toast({ title: "Product updated", status: "success" });
            fetchProducts();
          } catch (e) {
            const msg = e?.message || "Update failed";
            // 409 → conflitto brand+model
            toast({ title: "Update failed", description: msg, status: "error" });
            throw e;
          }
        }}
        onDelete={async (id) => {
          const t = getToken();
          try {
            await deleteProduct(t, id);
            toast({ title: "Product deleted", status: "success" });
            fetchProducts();
          } catch (e) {
            toast({ title: "Delete failed", description: e?.message || "Error", status: "error" });
            throw e;
          }
        }}
      />

      <ProductDetailModal
        isOpen={isDetailOpen}
        onClose={() => { onDetailClose(); setDetailProd(null); }}
        product={detailProd}
        onEdit={(p) => {
          onDetailClose();
          openEdit(p);   
        }}
        onDelete={async (id) => {
          const t = getToken();
          try {
            await deleteProduct(t, id);
            toast({ title: "Product deleted", status: "success" });
            fetchProducts();
          } catch (e) {
            toast({ title: "Delete failed", description: e?.message || "Error", status: "error" });
            throw e;
          }
        }}
      />
    </Box>
  );
}
