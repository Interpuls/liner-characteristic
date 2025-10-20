// pages/products.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Heading, Button, HStack, useToast, Card, CardBody, CardHeader, Show, IconButton } from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";
import { getToken } from "../lib/auth";
import { getMe, getProductsMeta, listProductPrefs, saveProductPref } from "../lib/api";

import ProductFilters from "../components/filters/ProductFilters";
import FancySelect from "../components/ui/FancySelect";

export default function Products() {
  const toast = useToast();
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({ brands:[], models:[], teat_sizes:[], kpis:[] });
  const [prefs, setPrefs] = useState([]);
  const [selection, setSelection] = useState({ count: 0 });
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
    const { brandModel, teatSizes, shapes, parlor, areas } = selection || {};

    // Single-value params preserved for backend filtering compatibility
    if (brandModel?.brands && brandModel.brands.length === 1) params.set("brand", brandModel.brands[0]);
    const allModels = Object.values(brandModel?.models || {}).flat();
    if (allModels.length === 1) params.set("model", allModels[0]);
    if (teatSizes && teatSizes.length === 1) params.set("teat_size", teatSizes[0]);

    // Multi-value params for UI summary (display-only)
    if (brandModel?.brands && brandModel.brands.length > 1) params.set("brands", brandModel.brands.join(","));
    if (allModels.length > 1) params.set("models", allModels.join(","));
    if (teatSizes && teatSizes.length > 1) params.set("teat_sizes", teatSizes.join(","));

    // Shapes used only client-side -> can always pass as CSV
    if (shapes && shapes.length > 0) params.set("barrel_shape", shapes.join(","));

    if (parlor && parlor[0]) params.set("parlor", parlor[0]);
    if (areas && areas.length) params.set("areas", areas.join(","));

    router.push(`/product/result?${params.toString()}`);
  };

  const onResetLocal = () => {
    // ProductFilters owns state and provides bottom Reset; nothing to do here.
  };

  // save is now handled in results page

  if (!me) return <Box p="6">Caricamento…</Box>;

  return (
    <>
      <Box as="main" position="relative" overflow="hidden" bg="#0b1f45" minH="100vh">
        {/* Blue gradient background + soft blur glows (like Home) */}
        <Box position="absolute" inset={0} zIndex={0}
             bgGradient="linear(180deg, rgba(13,39,82,1) 0%, rgba(18,48,95,1) 35%, rgba(5,21,49,1) 100%)" />
        <Box
          position="absolute"
          top={{ base: "-60%", md: "-20%" }}
          left="50%"
          transform="translateX(-50%)"
          w={{ base: "120vw", md: "1200px" }}
          h={{ base: "120vw", md: "1200px" }}
          borderRadius="full"
          bgGradient="radial(closest-side, rgba(72,118,255,0.45), transparent 70%)"
          filter={{ base: "blur(40px)", md: "blur(70px)" }}
        />
        <Box
          position="absolute"
          top={{ base: "-10%", md: "10%" }}
          left="50%"
          transform="translateX(-50%)"
          w={{ base: "80vw", md: "800px" }}
          h={{ base: "80vw", md: "800px" }}
          borderRadius="full"
          bgGradient="radial(closest-side, rgba(88,140,255,0.25), transparent 70%)"
          filter={{ base: "blur(40px)", md: "blur(60px)" }}
          display={{ base: "none", md: "block" }}
        />

        {/* Content container */}
        <Box maxW="6xl" mx="auto" px={{ base:0, md:8 }} pt={{ base:0, md:6 }} position="relative" zIndex={1}>
          {/* Header: Back + Filters title */}
          <Card mb={4} overflow="hidden"
          mx={{ base: 0, md: 0 }} borderRadius={{ base: 0, md: 0 }}
          borderWidth={{ base: 0, md: 0 }} borderColor="transparent" border="0"
          position="sticky" top={0} zIndex={2}
          boxShadow={{ base: "0 10px 24px rgba(0,0,0,0.40)", md: "0 16px 36px rgba(0,0,0,0.50)" }}
          borderBottomWidth="1px" borderBottomColor="whiteAlpha.200"
        >
          <CardHeader bg="rgba(12,26,58,0.96)" color="white" py={{ base:4, md:4 }} px={{ base:4, md:6 }} backdropFilter="saturate(120%) blur(6px)">
            <HStack gap={3} w={{ base:"full", md:"auto" }}>
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
              <Heading size={{ base: "xl", md: "xl" }} color="white">Filters</Heading>
            </HStack>
          </CardHeader>
        </Card>

        <Card
          mx={{ base: 0, md: 0 }}
          borderRadius={{ base: 0, md: "md" }}
          borderWidth={{ base: 0, md: "1px" }}
          borderColor={{ base: "transparent", md: "whiteAlpha.300" }}
          boxShadow={{ base: "none", md: "sm" }}
          bg={{ base: "transparent", md: "rgba(12, 26, 58, 0.55)" }}
          backdropFilter={{ base: undefined, md: "saturate(120%) blur(6px)" }}
        >
          <CardBody pt={{ base: 6, md: 6 }} px={{ base:4, md:6 }}>
            {/* Preference research selector below header, no back icon */}
            <HStack justify="flex-start" mb={{ base: 5, md: 6 }} align="center">
              <FancySelect
                options={prefs.map(p => ({ label: p.name, value: String(p.id) }))}
                value={prefId}
                onChange={setPrefId}
                placeholder="Preference research"
                size="sm"
                w={{ base:"full", md:"320px" }}
                variant="solid"
                bg="#0c1f44"
                color="white"
                iconColor="white"
                _hover={{ bg: "#0b1f45" }}
                _active={{ bg: "#0b1f45" }}
                transition="background 0.15s ease"
                menuColorMode="dark"
              />
            </HStack>
            <ProductFilters meta={meta} onSelectionsChange={setSelection} onConfirm={onConfirm} value={loadedPref} />
          </CardBody>
        </Card>

          {/* Mobile: nessun logout in questa pagina */}
          <Show below="md">
            {/* niente */}
          </Show>
        </Box>
      </Box>

      {/* Save modal removed; Save action lives in results page */}
    </>
  );
}
