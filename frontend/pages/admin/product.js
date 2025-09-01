// pages/admin/products.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack, IconButton,
  FormControl, FormLabel, SimpleGrid, useToast, Divider, Card, CardBody, CardHeader,
  Tag, TagLabel, Show, Hide, VStack, InputGroup, InputLeftElement, CloseButton,
  Spinner, Icon, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton
} from "@chakra-ui/react";
import { AddIcon, SearchIcon, ArrowBackIcon, ChevronLeftIcon, EditIcon } from "@chakra-ui/icons";
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
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  // stato di saving

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
            {products.map((p) => (
              <ProductCard
                key={p.id ?? `${p.brand}-${p.model}`}
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
      />
    </Box>
  );
}
