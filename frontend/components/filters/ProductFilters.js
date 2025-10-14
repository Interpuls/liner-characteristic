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

export default function ProductFilters({ meta, onSelectionsChange, onConfirm }) {
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

  const isMobile = useBreakpointValue({ base: true, md: false });

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
        <HStack spacing={2} wrap="wrap">
          <FilterButton label="Reference Area" summary={refSummary} onClick={refArea.onOpen} />
          <FilterButton label="Brand / Model" summary={bmSummary} onClick={brandModel.onOpen} />
          <FilterButton label="Teat Size" summary={tsSummary} onClick={teatSize.onOpen} />
          <FilterButton label="Barrel Shape" summary={shapeSummary} onClick={barrelShape.onOpen} />
          <FilterButton label="Parlor Type" summary={parlorSummary} onClick={parlorType.onOpen} />
          <Spacer />
          <Text fontSize="sm" color="gray.600">{count} liners</Text>
        </HStack>
      )}

      {/* Bottom CTA: Reset (left) and See X liners (right) */}
      <HStack mt={{ base: 9, md: 8 }} justify="space-between">
        <Button variant="outline" onClick={() => {
          setAreas([]);
          setBrandModelSel({ brands: [], models: {} });
          setTeatSizes([]);
          setShapes([]);
          setParlor([]);
        }}>Reset</Button>
        <Button colorScheme="blue" onClick={() => onConfirm && onConfirm()}>
          {`See ${count} liners`}
        </Button>
      </HStack>

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
