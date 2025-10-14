// pages/products.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Heading, Button, HStack, useToast, Card, CardBody, CardHeader, Show } from "@chakra-ui/react";
import { StarIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, saveProductPref } from "../lib/api";

import ProductFilters from "../components/filters/ProductFilters";
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input, IconButton } from "@chakra-ui/react";
import FancySelect from "../components/ui/FancySelect";

export default function Products() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ brands:[], models:[], teat_sizes:[], kpis:[] });
  const [prefs, setPrefs] = useState([]);
  const [selection, setSelection] = useState({ count: 0 });
  const saveCtrl = useDisclosure();
  const [saveName, setSaveName] = useState("");
  const [prefId, setPrefId] = useState("");
  const [loadedPref, setLoadedPref] = useState(null);

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

  // when a preference is selected, load its saved filters into ProductFilters
  useEffect(() => {
    if (!prefId) { setLoadedPref(null); return; }
    const sel = prefs.find(p => String(p.id) === String(prefId));
    if (!sel) { setLoadedPref(null); return; }
    setLoadedPref(sel.filters || null);
  }, [prefId, prefs]);

  const onConfirm = () => {
    const params = new URLSearchParams();
    // Map multi-selections to a minimal query supported by current results page
    const { brandModel, teatSizes, shapes, parlor, areas } = selection || {};
    // If exactly one brand
    if (brandModel?.brands && brandModel.brands.length === 1) params.set("brand", brandModel.brands[0]);
    // If exactly one model across all brands
    const allModels = Object.values(brandModel?.models || {}).flat();
    if (allModels.length === 1) params.set("model", allModels[0]);
    if (teatSizes && teatSizes.length === 1) params.set("teat_size", teatSizes[0]);
    if (shapes && shapes.length === 1) params.set("barrel_shape", shapes[0]);
    if (parlor && parlor[0]) params.set("parlor", parlor[0]);
    if (areas && areas.length) params.set("areas", areas.join(","));

    router.push(`/product/result?${params.toString()}`);
  };

  const onResetLocal = () => {
    // ProductFilters owns state and provides bottom Reset; nothing to do here.
  };

  const onSaveSearch = async () => {
    try {
      const t = getToken();
      if (!t) { window.location.replace("/login"); return; }
      if (!saveName.trim()) { toast({ status: "warning", title: "Insert a name" }); return; }
      await saveProductPref(t, saveName.trim(), selection || {});
      toast({ status: "success", title: "Saved in Preference Research" });
      setSaveName("");
      saveCtrl.onClose();
      // refresh list
      listProductPrefs(t).then(setPrefs).catch(()=>{});
    } catch (e) {
      toast({ status: "error", title: e?.message || "Unable to save preference" });
    }
  };

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <>
      <Box as="main" maxW="6xl" mx="auto" px={{ base:0, md:8 }} pt={{ base:0, md:6 }}>
        {/* CardHeader: SOLO Preference research */}
        <Card mb={4} overflow="hidden"
          mx={{ base: 0, md: 0 }} borderRadius={{ base: 0, md: "md" }}
          borderWidth={{ base: 0, md: "1px" }} borderColor="gray.200"
        >
          <CardHeader bg="#12305f" color="white" py={{ base:3, md:4 }} px={{ base:4, md:6 }}>
            <HStack gap={2} w={{ base:"full", md:"auto" }}>
              <IconButton
                as={NextLink}
                href="/"
                aria-label="Back to home"
                icon={<ChevronLeftIcon boxSize={6} />}
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                size="sm"
              />
              <FancySelect
                options={prefs.map(p => ({ label: p.name, value: String(p.id) }))}
                value={prefId}
                onChange={setPrefId}
                placeholder="Preference research"
                size="sm"
                w={{ base:"full", md:"320px" }}
                bg="white"
                color="black"
              />
            </HStack>
          </CardHeader>
        </Card>

        {/* helper text removed per request */}

        <Card
          mx={{ base: 0, md: 0 }}
          borderRadius={{ base: 0, md: "md" }}
          borderWidth={{ base: 0, md: "1px" }}
          borderColor="gray.200"
          boxShadow={{ base: "none", md: "sm" }}
          bg={{ base: "transparent", md: "white" }}
        >
          <CardHeader py="3" px={{ base:4, md:6 }}>
            <HStack justify="space-between">
              <Heading size={{ base: "2xl", md: "lg" }} color="#12305f">Filters</Heading>
              <Button
                onClick={saveCtrl.onOpen}
                size="sm"
                leftIcon={<StarIcon />}
                variant="outline"
                borderColor="gray.300"
                color="#12305f"
                _hover={{ borderColor: "gray.400", bg: "gray.50" }}
              >
                Save
              </Button>
            </HStack>
          </CardHeader>
          <CardBody pt={{ base: 4, md: 4 }} px={{ base:4, md:6 }}>
            <ProductFilters meta={meta} onSelectionsChange={setSelection} onConfirm={onConfirm} value={loadedPref} />
          </CardBody>
        </Card>

        {/* Mobile: nessun logout in questa pagina */}
        <Show below="md">
          {/* niente */}
        </Show>
      </Box>

      {/* Save preference modal */}
      <Modal isOpen={saveCtrl.isOpen} onClose={saveCtrl.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save search</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input placeholder="Enter a name" value={saveName} onChange={(e)=>setSaveName(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <HStack w="full" justify="space-between">
              <Button variant="ghost" onClick={saveCtrl.onClose}>Cancel</Button>
              <Button colorScheme="blue" onClick={onSaveSearch}>Save</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
