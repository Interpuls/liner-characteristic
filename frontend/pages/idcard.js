import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, Button, Select, Input, HStack, Stack,
  FormControl, FormLabel, SimpleGrid, useToast, Card, CardBody, CardHeader,
  Show, IconButton, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, saveProductPref, getModelsByBrand } from "../lib/api";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

export default function Idcard() {
  const toast = useToast();
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [prefs, setPrefs] = useState([]);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  // stellina / modal
  const [isStarOn, setIsStarOn] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [prefName, setPrefName] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
    getMe(t).then(setMe).catch(() => {
      toast({ status: "error", title: "Sessione scaduta" });
      window.location.replace("/login");
    });

    // meta iniziale: prendo i brand (già filtrati da only_admin lato backend)
    getProductsMeta(t)
      .then((m) => setBrands(m?.brands ?? []))
      .catch(() => setBrands([]));

    listProductPrefs(t).then(setPrefs).catch(()=>{});
  }, [toast]);

  const handleBrandChange = async (b) => {
    setBrand(b);
    setModel("");
    if (!b) { setModels([]); return; }
    try {
      const list = await getModelsByBrand(token, b);
      setModels(list || []);
    } catch {
      setModels([]);
    }
  };

  const onConfirm = () => {
      if (!model) {
        toast({ status: "warning", title: "Seleziona almeno un modello per continuare." });
        return;
      }
      const params = new URLSearchParams();
      if (brand) params.set("brand", brand);
      if (model) params.set("model", model);
      router.push(`/idcard/idresult?${params.toString()}`); // <-- nuovo path
    };

  const openSaveModal = () => {
    setIsStarOn(true);
    onOpen();
  };

  const onSaveFilters = async () => {
    if (!prefName.trim()) {
      toast({ status: "info", title: "Inserisci un nome per la preferenza." });
      return;
    }
    try {
      await saveProductPref(token, prefName.trim(), { brand, model });
      toast({ status: "success", title: "Preferenza salvata!" });
      const updated = await listProductPrefs(token);
      setPrefs(updated);
      setPrefName("");
      onClose();
    } catch {
      toast({ status: "error", title: "Errore salvataggio preferenza" });
    } finally {
      setIsStarOn(false);
    }
  };

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <>
      <AppHeader title="Liner ID Card" backHref="/home" />

      <Box as="main" maxW="6xl" mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        <Text color="gray.600" mb={4}>Select one liner model and confirm.</Text>

        {/* Search Preferences */}
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
                iconColor="gray.500"
                _focus={{ borderColor: "white", boxShadow: "0 0 0 1px white", bg:"#eaebeda2" }}
                onChange={async (e) => {
                  const sel = prefs.find(p => String(p.id) === e.target.value);
                  if (!sel) return;
                  const b = sel.filters?.brand ?? "";
                  const m = sel.filters?.model ?? "";
                  setBrand(b);
                  setModel("");
                
                  // se c’è il brand, ricarico i models coerenti e poi setto il model
                  if (b) {
                    try {
                      const list = await getModelsByBrand(token, b);
                      setModels(list || []);
                      if (m && list?.includes(m)) setModel(m);
                    } catch { setModels([]); }
                  } else {
                    setModels([]);
                  }
                }}
              >
                {prefs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </HStack>
          </CardHeader>
        </Card>

        {/* Card Filters */}
        <Card>
          <CardHeader py="3">
            <HStack justify="space-between" align="center">
              <Heading size="sm">Filters</Heading>
              <IconButton
                aria-label="Save filters"
                icon={<StarIcon />}
                size="sm"
                variant="ghost"
                color={isStarOn ? "yellow.400" : "gray.300"}
                _hover={{ color: "yellow.400" }}
                onClick={openSaveModal}
              />
            </HStack>
          </CardHeader>

          <CardBody pt="0">
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={2}>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.500" mb={1}>Brand</FormLabel>
                <Select
                  placeholder="Tutti"
                  value={brand}
                  onChange={(e)=>handleBrandChange(e.target.value)}
                  variant="filled"        
                  size="md"
                  rounded="md"
                  bg="white"
                  color="black"
                  iconColor="gray.500"
                  iconSize="1rem"
                  shadow="sm"
                  _hover={{ bg: "white" }}
                  _focus={{ bg: "white", borderColor: "blue.400", boxShadow: "0 0 0 1px #4299E1" }}
                  _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                >
                
                  {(brands || []).map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.500" mb={1}>Model</FormLabel>
                <Select
                  placeholder="Seleziona"
                  value={model}
                  onChange={e=>setModel(e.target.value)}
                  isDisabled={!brand}   
                  variant="filled"          // o "outline" se preferisci
                  size="md"
                  rounded="md"
                  bg="white"
                  color="black"
                  iconColor="gray.500"
                  iconSize="1rem"
                  shadow="sm"
                  _hover={{ bg: "white" }}
                  _focus={{ bg: "white", borderColor: "blue.400", boxShadow: "0 0 0 1px #4299E1" }}
                  _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                >                
                  {(models || []).map(v => <option key={v} value={v}>{v}</option>)}
                </Select>
              </FormControl>
            </SimpleGrid>
          </CardBody>
        </Card>

        <HStack mt={6} justify="center">
          <Button colorScheme="blue" onClick={onConfirm}>Confirm</Button>
        </HStack>

        <Show below="md">{/* niente */}</Show>
      </Box>

      <AppFooter appName="Liner Characteristic App" />

      {/* Modal salvataggio preferenza */}
      <Modal isOpen={isOpen} onClose={() => { setIsStarOn(false); onClose(); }}>
        <ModalOverlay />
        <ModalContent marginInline={2}>
          <ModalHeader>Salva preferenza</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                Salverò i filtri correnti (brand/model) come preferenza.
              </Text>
              <FormControl isRequired>
                <FormLabel>Nome preferenza</FormLabel>
                <Input
                  placeholder="Es. Ricerca standard"
                  value={prefName}
                  onChange={(e)=>setPrefName(e.target.value)}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={() => { setIsStarOn(false); onClose(); }}>Annulla</Button>
              <Button colorScheme="blue" onClick={onSaveFilters}>Salva</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
