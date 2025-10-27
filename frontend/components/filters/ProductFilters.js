import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, HStack, Stack, useDisclosure, Text, Spacer, Divider, useBreakpointValue, Button } from "@chakra-ui/react";
import FilterButton from "./FilterButton";
import FilterRow from "./FilterRow";
import ReferenceAreaFilterModal from "./ReferenceAreaFilterModal";
import BrandModelFilterModal from "./BrandModelFilterModal";
import ChipSelectFilterModal from "./ChipSelectFilterModal";
import { getToken } from "../../lib/auth";
import { listProducts } from "../../lib/api";
import { FiGlobe, FiTag, FiAperture, FiBox, FiCpu } from "react-icons/fi";

const TEAT_SIZE_OPTIONS = ["40", "50", "60", "70"]; // UI labels; non-influential to count (all products have all sizes)
const BARREL_SHAPES = ["squared", "triangular", "round"];
const PARLOR_TYPES = ["robot", "conventional"]; // robot => robot_liner=true; conventional => false

export default function ProductFilters({ meta, onSelectionsChange, onConfirm, value }) {
  // reference area
  const refArea = useDisclosure();
  const brandModel = useDisclosure();
  const teatSize = useDisclosure();
  const barrelShape = useDisclosure();
  const parlorType = useDisclosure();

  const [areas, setAreas] = useState([]); // ["Global", ...]
  const [brandModelSel, setBrandModelSel] = useState({ brands: [], models: {} });
  const [teatSizes, setTeatSizes] = useState([]); // ["40",...]
  const [shapes, setShapes] = useState([]); // ["round",...]
  const [parlor, setParlor] = useState([]); // single ["robot"] or ["conventional"]

  const [count, setCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  // compute summary labels
  const refSummary = areas.length === 0 ? undefined : (areas.includes("Global") ? "Global" : `${areas.length} selected`);
  const bmSummary = (() => {
    const b = brandModelSel.brands?.length || 0;
    const m = Object.values(brandModelSel.models || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
    const total = b + m;
    return total ? `${total} selected` : undefined;
  })();
  const tsSummary = teatSizes.length ? `${teatSizes.length} selected` : undefined;
  const shapeSummary = shapes.length ? `${shapes.length} selected` : undefined;
  const parlorSummary = parlor[0] ? (parlor[0] === "robot" ? "Robot" : "Conventional") : undefined;

  const computeCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const t = getToken();
      // Fetch a reasonable number and filter client-side (backend lacks these filters)
      const all = await listProducts(t, { limit: 500 });
      const items = Array.isArray(all) ? all : [];

      const matches = items.filter((p) => {
        // brand/model
        let okBM = true;
        const bSel = new Set(brandModelSel.brands || []);
        const modelsByBrand = brandModelSel.models || {};
        const hasBrand = p.brand && bSel.has(p.brand);
        const hasModel = p.brand && p.model && Array.isArray(modelsByBrand[p.brand]) && modelsByBrand[p.brand].includes(p.model);
        const hasAnyBM = bSel.size > 0 || Object.values(modelsByBrand).some((arr) => (arr?.length || 0) > 0);
        if (hasAnyBM) okBM = hasBrand || hasModel;

        // barrel shape
        let okShape = true;
        if (shapes.length > 0) okShape = p.barrel_shape && shapes.includes(String(p.barrel_shape));

        // parlor type
        let okParlor = true;
        if (parlor[0] === "robot") okParlor = !!p.robot_liner;
        if (parlor[0] === "conventional") okParlor = !p.robot_liner;

        // reference areas
        let okArea = true;
        if (areas.length > 0 && !areas.includes("Global")) {
          const list = Array.isArray(p.reference_areas) ? p.reference_areas : [];
          okArea = areas.some((a) => list.includes(a));
        }

        return okBM && okShape && okParlor && okArea;
      });
      const sizesCount = teatSizes.length > 0 ? teatSizes.length : 4; // 4 standard applications
      setCount(matches.length * sizesCount);
    } catch {
      setCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, [areas, brandModelSel, shapes, parlor, teatSizes]);

  useEffect(() => { computeCount(); }, [computeCount]);

  // expose selections to parent
  useEffect(() => {
    if (!onSelectionsChange) return;
    onSelectionsChange({ areas, brandModel: brandModelSel, teatSizes, shapes, parlor, count });
  }, [areas, brandModelSel, teatSizes, shapes, parlor, count, onSelectionsChange]);

  // allow parent to inject saved selections
  useEffect(() => {
    if (!value) return;
    try {
      const v = value || {};
      if (Array.isArray(v.areas)) setAreas(v.areas);
      if (v.brandModel) {
        const bm = v.brandModel;
        setBrandModelSel({
          brands: Array.isArray(bm.brands) ? bm.brands : [],
          models: typeof bm.models === "object" && bm.models !== null ? bm.models : {},
        });
      }
      if (Array.isArray(v.teatSizes)) setTeatSizes(v.teatSizes.map(String));
      if (Array.isArray(v.shapes)) setShapes(v.shapes);
      if (Array.isArray(v.parlor)) setParlor(v.parlor);
    } catch {
      // ignore malformed saved value
    }
  }, [value]);

  const isMobile = useBreakpointValue({ base: true, md: false });
  const isDesktop = !isMobile;

  return (
    <Box>
      {isMobile ? (
        <Stack divider={<Divider />} spacing={2}>
          <FilterRow icon={FiGlobe} label="Reference Area" summary={refSummary || "Indifferent"} onClick={refArea.onOpen} />
          <FilterRow icon={FiTag} label="Brand / Model" summary={bmSummary || "Indifferent"} onClick={brandModel.onOpen} />
          <FilterRow icon={FiAperture} label="Teat Size" summary={tsSummary || "Indifferent"} onClick={teatSize.onOpen} />
          <FilterRow icon={FiBox} label="Barrel Shape" summary={shapeSummary || "Indifferent"} onClick={barrelShape.onOpen} />
          <FilterRow icon={FiCpu} label="Parlor Type" summary={parlorSummary || "Indifferent"} onClick={parlorType.onOpen} />
        </Stack>
      ) : (
        <Stack divider={<Divider />} spacing={3}>
          <FilterRow icon={FiGlobe} label="Reference Area" summary={refSummary || "Indifferent"} onClick={refArea.onOpen} labelSize={{ base: 'md', md: 'lg' }} />
          <FilterRow icon={FiTag} label="Brand / Model" summary={bmSummary || "Indifferent"} onClick={brandModel.onOpen} labelSize={{ base: 'md', md: 'lg' }} />
          <FilterRow icon={FiAperture} label="Teat Size" summary={tsSummary || "Indifferent"} onClick={teatSize.onOpen} labelSize={{ base: 'md', md: 'lg' }} />
          <FilterRow icon={FiBox} label="Barrel Shape" summary={shapeSummary || "Indifferent"} onClick={barrelShape.onOpen} labelSize={{ base: 'md', md: 'lg' }} />
          <FilterRow icon={FiCpu} label="Parlor Type" summary={parlorSummary || "Indifferent"} onClick={parlorType.onOpen} labelSize={{ base: 'md', md: 'lg' }} />
        </Stack>
      )}

      {/* Bottom CTA: centered vertical buttons */}
      <Stack mt={{ base: 12, md: 6 }} spacing={3} align="center">
        <Button
          onClick={() => onConfirm && onConfirm()}
          w="full"
          maxW={{ base: "320px", md: "240px" }}
          size={{ base: "md", md: "sm" }}
          borderRadius="9999px"
          position="relative"
          overflow="hidden"
          color="#0c1a3a"
          borderWidth="1px"
          borderColor="whiteAlpha.400"
          bgGradient="linear(135deg, rgba(255,255,255,0.10) 0%, rgba(43,108,176,0.42) 50%, rgba(255,255,255,0.08) 100%)"
          backdropFilter={{ base: "saturate(130%) blur(6px)", md: "saturate(150%) blur(10px)" }}
          boxShadow="0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)"
          _hover={{
            bgGradient: "linear(135deg, rgba(255,255,255,0.14) 0%, rgba(49,130,206,0.52) 50%, rgba(255,255,255,0.12) 100%)",
            borderColor: "whiteAlpha.600",
            boxShadow: "0 12px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.22)",
            transform: "translateY(-1px)",
          }}
          _active={{
            transform: "translateY(0)",
            bgGradient: "linear(135deg, rgba(255,255,255,0.10) 0%, rgba(43,108,176,0.36) 50%, rgba(255,255,255,0.08) 100%)",
          }}
          transition="all 0.2s ease"
          sx={{
            _before: {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(80% 140% at 20% 0%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
              pointerEvents: 'none',
            },
          }}
        >
          {`See ${count} liners`}
        </Button>
        <Button
          onClick={() => {
            setAreas([]);
            setBrandModelSel({ brands: [], models: {} });
            setTeatSizes([]);
            setShapes([]);
            setParlor([]);
          }}
          variant="link"
          color="gray.300"
          _hover={{ color: "gray.200" }}
          w="full"
          maxW={{ base: "320px", md: "220px" }}
          justifyContent="center"
          fontSize={{ base: "sm", md: "xs" }}
        >
          Clear Filters
        </Button>
      </Stack>

      <ReferenceAreaFilterModal
        isOpen={refArea.isOpen}
        onClose={refArea.onClose}
        value={areas}
        onChange={setAreas}
        count={count}
        loading={loadingCount}
      />

      <BrandModelFilterModal
        isOpen={brandModel.isOpen}
        onClose={brandModel.onClose}
        brands={meta?.brands || []}
        value={{ brands: brandModelSel.brands || [], models: brandModelSel.models || {} }}
        onChange={(v) => setBrandModelSel({ brands: v.brands || [], models: v.models || {} })}
        count={count}
        loading={loadingCount}
      />

      <ChipSelectFilterModal
        isOpen={teatSize.isOpen}
        onClose={teatSize.onClose}
        title="Teat Size"
        options={TEAT_SIZE_OPTIONS}
        value={teatSizes}
        onChange={setTeatSizes}
        count={count}
        loading={loadingCount}
      />

      <ChipSelectFilterModal
        isOpen={barrelShape.isOpen}
        onClose={barrelShape.onClose}
        title="Barrel Shape"
        options={BARREL_SHAPES}
        value={shapes}
        onChange={setShapes}
        count={count}
        loading={loadingCount}
      />

      <ChipSelectFilterModal
        isOpen={parlorType.isOpen}
        onClose={parlorType.onClose}
        title="Parlor Type"
        options={PARLOR_TYPES}
        value={parlor}
        onChange={setParlor}
        single
        count={count}
        loading={loadingCount}
      />
    </Box>
  );
}
