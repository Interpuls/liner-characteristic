// pages/products/search.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Stack, Tag, TagLabel, Button,
  Card, CardBody, SimpleGrid, useToast, Spinner,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input,
  Flex, Grid, IconButton, Icon, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Tooltip,
} from "@chakra-ui/react";
import { ArrowUpDownIcon } from "@chakra-ui/icons";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import FiltersSummaryCard from "../../components/result/FiltersSummaryCard";
import { getToken } from "../../lib/auth";
import { getMe, listProducts, saveProductPref, listProductApplications, listProductApplicationsBatchByProducts, getKpiValuesBatch } from "../../lib/api";
import { latestKpiByCode } from "../../lib/kpi";
import { RiFlaskLine } from "react-icons/ri";
import { TbChartRadar, TbArrowsRightLeft } from "react-icons/tb";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { formatTeatSize } from "../../lib/teatSizes";

// In-memory cache to dedupe repeated /products/{id}/applications calls in this tab/session.
const productAppsCache = new Map(); // productId -> applications[]
const productAppsInFlight = new Map(); // productId -> Promise<applications[]>

const RESULT_KPIS = [
  { code: "CLOSURE", abbr: "CLS" },
  { code: "FITTING", abbr: "FIT" },
  { code: "CONGESTION_RISK", abbr: "CGR" },
  { code: "HYPERKERATOSIS_RISK", abbr: "HKR" },
  { code: "SPEED", abbr: "SPD" },
  { code: "RESPRAY", abbr: "RSP" },
  { code: "FLUYDODINAMIC", abbr: "FLD" },
  { code: "SLIPPAGE", abbr: "SLP" },
  { code: "RINGING_RISK", abbr: "RNG" },
];

const BARREL_SHAPE_ICON = {
  round: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  triangular: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <polygon points="12 4 20 18 4 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  squared: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
};

const BARREL_SHAPE_LABEL = { round: "Round", triangular: "Triangular", squared: "Squared" };

const scoreColor = (score) => {
  if (score >= 4) return "#2f9d61";
  if (score === 3) return "#72bf44";
  if (score === 2) return "#e3a224";
  if (score === 1) return "#ef4444";
  return "#cbd5e1";
};

const formatSortKpiLabel = (code) =>
  String(code || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const RESULT_GRID_TEMPLATE = {
  base: "minmax(120px, 1.8fr) repeat(9, minmax(32px, 1fr))",
  md: "460px repeat(9, minmax(70px, 1fr))",
};

async function getProductApplicationsCached(token, productId) {
  if (!productId) return [];
  if (productAppsCache.has(productId)) return productAppsCache.get(productId);
  if (productAppsInFlight.has(productId)) return productAppsInFlight.get(productId);
  const p = listProductApplications(token, productId)
    .then((apps) => {
      const safe = Array.isArray(apps) ? apps : [];
      productAppsCache.set(productId, safe);
      return safe;
    })
    .finally(() => {
      productAppsInFlight.delete(productId);
    });
  productAppsInFlight.set(productId, p);
  return p;
}

function ScoreBlock({ value, isFirst, isLast }) {
  const score = value?.score ?? null;
  return (
    <Flex
      align="center"
      justify="center"
      h={{ base: "36px", md: "40px" }}
      minW={{ base: "36px", md: "76px" }}
      w="100%"
      bg={scoreColor(score)}
      color="white"
      fontSize={{ base: "xs", md: "sm" }}
      fontWeight="800"
      borderLeftWidth="2px"
      borderLeftColor="white"
      borderTopLeftRadius={isFirst ? "8px" : 0}
      borderBottomLeftRadius={isFirst ? "8px" : 0}
      borderTopRightRadius={isLast ? "8px" : 0}
      borderBottomRightRadius={isLast ? "8px" : 0}
    >
      {score ?? "-"}
    </Flex>
  );
}

function LinerResultsTable({
  rows,
  total,
  sortKpi,
  sortDir,
  sortingBusy,
  kpiScores,
  appIdByKey,
  isAdmin,
  pinnedKeys,
  onTogglePin,
  onOpenDetails,
  onSelectSortKpi,
  onToggleDir,
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="#e6ebf2"
      borderRadius="12px"
      overflow="hidden"
      bg="white"
    >
      <Box overflowX={{ base: "hidden", md: "auto" }}>
        <Grid
          templateColumns={RESULT_GRID_TEMPLATE}
          minW={{ base: "100%", md: "960px" }}
          bg="#fbfcfe"
          borderBottomWidth="1px"
          borderBottomColor="#e6ebf2"
        >
          <Box px={{ base: "8px", md: 4 }} py={3}>
            <HStack align="flex-end" spacing={{ base: 1, md: 3 }} flexWrap="wrap">
              <Text fontSize={{ base: "14px", md: "35px" }} fontWeight="bold" color="#12305f" lineHeight="1">
                Liners
              </Text>
              <HStack spacing={{ base: 1, md: 2 }} align="center" flexWrap="wrap">
                <Tag size={{ base: "xs", md: "sm" }} bg="#eef3f8" color="#52677f" borderRadius="10px" px={{ base: 2, md: 3 }} h="24px">
                  <TagLabel fontSize={{ base: "10px", md: "xs" }} fontWeight="800">{total} results</TagLabel>
                </Tag>
                <Menu>
                  <Tooltip label={sortKpi ? `Sorting by ${formatSortKpiLabel(sortKpi)} (${sortDir})` : "Sort by KPI"} hasArrow>
                    <MenuButton
                      as={Button}
                      size="xs"
                      leftIcon={<ArrowUpDownIcon />}
                      aria-label="Sort by KPI"
                      variant="outline"
                      isLoading={sortingBusy}
                      borderRadius="10px"
                      borderColor={sortKpi ? "blue.500" : "gray.200"}
                      color={sortKpi ? "blue.600" : "#344054"}
                      _hover={{ borderColor: sortKpi ? "blue.500" : "gray.300", bg: "gray.50" }}
                      px={2}
                      h="28px"
                    >
                      <Text fontSize="10px">{sortKpi ? formatSortKpiLabel(sortKpi) : "Sort by KPI"}</Text>
                    </MenuButton>
                  </Tooltip>
                  <MenuList>
                    <MenuItem onClick={() => onSelectSortKpi?.(null)}>Clear sort</MenuItem>
                    <MenuItem onClick={() => onToggleDir?.()}>Direction: {sortDir === "asc" ? "Ascending" : "Descending"}</MenuItem>
                    <MenuDivider />
                    {RESULT_KPIS.map((kpi) => (
                      <MenuItem key={kpi.code} onClick={() => onSelectSortKpi?.(kpi.code)}>
                        {formatSortKpiLabel(kpi.code)}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </HStack>
            </HStack>
          </Box>
          {RESULT_KPIS.map((kpi) => (
            <Flex key={kpi.code} align="center" justify="center" py={3}>
              <Text fontSize="xs" fontWeight="800" color="#718096">
                {kpi.abbr}
              </Text>
            </Flex>
          ))}
        </Grid>

        <Box minW={{ base: "100%", md: "960px" }}>
          {rows.map((item) => {
            const isPinned = pinnedKeys.includes(item.key);
            return (
              <Grid
                key={item.key}
                templateColumns={RESULT_GRID_TEMPLATE}
                alignItems="center"
                minH="66px"
                position="relative"
                zIndex={isPinned ? 2 : 1}
                bg={isPinned ? "white" : "transparent"}
                boxShadow={isPinned ? "0 6px 14px rgba(15, 23, 42, 0.08)" : "none"}
                borderBottomWidth="1px"
                borderBottomColor="#edf2f7"
                cursor="pointer"
                _hover={{ bg: "#fbfcfe" }}
                onClick={() => onOpenDetails(item)}
              >
                <Box px={{ base: "5px", md: 4 }} py={{ base: 3, md: 0 }} minW={0}>
                  <HStack align="flex-start" spacing={2} minW={0}>
                    <IconButton
                      aria-label={isPinned ? "Unpin liner" : "Pin liner"}
                      icon={isPinned ? <BsPinAngleFill /> : <BsPinAngle />}
                      size="xs"
                      variant="ghost"
                      color={isPinned ? "#3b82f6" : "#cbd5e1"}
                      _hover={{ bg: "blue.50", color: "blue.500" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(item.key);
                      }}
                    />
                    <Box minW={0}>
                      <HStack align="center" spacing={2} minW={0}>
                        <Text fontSize={{ base: "12px", md: "sm" }} fontWeight="800" color="#253044" noOfLines={1}>
                          {item.model || "-"}
                        </Text>
                        {(() => {
                          const shapeKey = String(item.barrel_shape || "").toLowerCase();
                          const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                          const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                          return ShapeIcon ? (
                            <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                              <HStack spacing={1} align="center" px={2} py={1} borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                                <ShapeIcon boxSize={4} />
                                <Text fontSize="xs" fontWeight="semibold" textTransform="capitalize">
                                  {shapeLabel}
                                </Text>
                              </HStack>
                            </Tooltip>
                          ) : null;
                        })()}
                      </HStack>
                      <HStack mt={2} spacing={{ base: 1, md: 2 }} flexWrap="wrap" align="center">
                        <Text fontSize={{ base: "10px", md: "xs" }} fontWeight="700" color="#8a98aa" noOfLines={1}>
                          {item.brand || "-"}
                        </Text>
                        <Tag size={{ base: "xs", md: "sm" }} bg="#eef3f8" color="#2f67bf" borderRadius="7px" px={{ base: 1, md: 2 }}>
                          <TagLabel fontSize={{ base: "10px", md: "11px" }} fontWeight="800">{formatTeatSize(item.size_mm)}</TagLabel>
                        </Tag>
                        {(isAdmin && item.compound) ? (
                          <Tag size={{ base: "xs", md: "sm" }} bg="#eef3f8" color="#52677f" borderRadius="7px" px={{ base: 1, md: 2 }}>
                            <TagLabel fontSize={{ base: "10px", md: "11px" }} fontWeight="800">{item.compound}</TagLabel>
                          </Tag>
                        ) : null}
                      </HStack>
                    </Box>
                  </HStack>
                </Box>

                {RESULT_KPIS.map((kpi, index) => (
                  <Box key={kpi.code} px={{ base: 1, md: 0 }}>
                    <ScoreBlock
                      value={kpiScores[item.key]?.[kpi.code]}
                      isFirst={index === 0}
                      isLast={index === RESULT_KPIS.length - 1}
                    />
                  </Box>
                ))}
              </Grid>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function PinnedLinerOverlay({
  item,
  index,
  kpiScores,
  appIdByKey,
  isAdmin,
  onUnpin,
  onOpenDetails,
}) {
  if (!item) return null;

  return (
    <Box
      position="fixed"
      top={{
        base: `${10 + index * 76}px`,
        md: `${12 + index * 78}px`,
      }}
      left={0}
      right={0}
      transform="none"
      w="100%"
      maxW="100%"
      px={{ base: 0, md: 0 }}
      zIndex={1400}
      borderWidth="1px"
      borderColor="blue.200"
      borderRadius="16px"
      bg="white"
      boxShadow="0 18px 40px rgba(15, 23, 42, 0.18)"
      overflowX={{ base: "hidden", md: "auto" }}
      overflowY="hidden"
      css={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Grid
        templateColumns={RESULT_GRID_TEMPLATE}
        alignItems="center"
        minH="66px"
        minW={{ base: "100%", md: "960px" }}
        cursor="pointer"
        onClick={() => onOpenDetails(item)}
      >
        <HStack px={{ base: "5px", md: 4 }} spacing={2} minW={0}>
          <IconButton
            aria-label="Unpin liner"
            icon={<BsPinAngleFill />}
            size="xs"
            variant="ghost"
            color="#3b82f6"
            _hover={{ bg: "blue.50", color: "blue.600" }}
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
          />
          <Box minW={0}>
            <HStack align="center" spacing={2} minW={0}>
              <Text fontSize="sm" fontWeight="800" color="#253044" noOfLines={1}>
                {item.model || "-"}
              </Text>
              {(() => {
                const shapeKey = String(item.barrel_shape || "").toLowerCase();
                const ShapeIcon = BARREL_SHAPE_ICON[shapeKey];
                const shapeLabel = BARREL_SHAPE_LABEL[shapeKey];
                return ShapeIcon ? (
                  <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                    <HStack spacing={1} align="center" px={2} py={1} borderWidth="1px" borderRadius="full" bg="gray.100" color="blue.500">
                      <ShapeIcon boxSize={4} />
                      <Text fontSize="xs" fontWeight="semibold" textTransform="capitalize">
                        {shapeLabel}
                      </Text>
                    </HStack>
                  </Tooltip>
                ) : null;
              })()}
            </HStack>
            <HStack mt={1} spacing={2} minW={0}>
              <Text fontSize="xs" fontWeight="700" color="#8a98aa" noOfLines={1}>
                {item.brand || "-"}
              </Text>
              <Tag size="sm" bg="#eef3f8" color="#2f67bf" borderRadius="7px">
                <TagLabel fontSize="11px" fontWeight="800">{formatTeatSize(item.size_mm)}</TagLabel>
              </Tag>
              {(isAdmin && item.compound) ? (
                <Tag size="sm" bg="#eef3f8" color="#52677f" borderRadius="7px">
                  <TagLabel fontSize="11px" fontWeight="800">{item.compound}</TagLabel>
                </Tag>
              ) : null}
              {!appIdByKey[item.key] ? (
                <Text fontSize="11px" color="#a0aec0">No application</Text>
              ) : null}
            </HStack>
          </Box>
        </HStack>

        {RESULT_KPIS.map((kpi, index) => (
          <ScoreBlock
            key={kpi.code}
            value={kpiScores[item.key]?.[kpi.code]}
            isFirst={index === 0}
            isLast={index === RESULT_KPIS.length - 1}
          />
        ))}
      </Grid>
    </Box>
  );
}

export default function ProductsSearchPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const saveCtrl = useDisclosure();
  const [saveName, setSaveName] = useState("");

  // Placeholder risultati (collega quando vuoi)
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // app-level items: [{key, product_id, brand, model, size_mm}]
  // Application-level items already live in `items`. Use them for tool selections.
  const [appIdByKey, setAppIdByKey] = useState({}); // key -> application_id
  const [kpiScores, setKpiScores] = useState({}); // key -> { [kpi_code]: { score, value_num } }
  const [sortingBusy, setSortingBusy] = useState(false);
  const [sortKpi, setSortKpi] = useState(null); // e.g., 'CLOSURE'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [pinnedKeys, setPinnedKeys] = useState([]);
  const [showPinnedOverlay, setShowPinnedOverlay] = useState(false);
  const resultsTableRef = useRef(null);
  const KPI_ORDER = [
    'CLOSURE','FITTING','CONGESTION_RISK','HYPERKERATOSIS_RISK','SPEED','RESPRAY','FLUYDODINAMIC','SLIPPAGE','RINGING_RISK'
  ];
  // Visible KPI filter removed for performance
  const isAdmin = me?.role === "admin";

  // Persist sort in sessionStorage (fast, no router churn)
  const loadedSortFromSS = useRef(false);
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const ss = window.sessionStorage;
      const savedKpi = ss.getItem('results.sort_kpi');
      const savedDir = ss.getItem('results.sort_dir');
      if (savedKpi) { setSortKpi(savedKpi); loadedSortFromSS.current = true; }
      if (savedDir === 'asc' || savedDir === 'desc') setSortDir(savedDir);
    } catch {}
  }, []);

  // When applying saved sort the first time, ensure scores for that KPI
  useEffect(() => {
    if (loadedSortFromSS.current && sortKpi) {
      (async () => { try { await ensureScoresFor(sortKpi); } catch {} finally { loadedSortFromSS.current = false; } })();
    }
  }, [sortKpi]);

  // Write sort to sessionStorage when it changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const ss = window.sessionStorage;
      if (sortKpi) ss.setItem('results.sort_kpi', sortKpi); else ss.removeItem('results.sort_kpi');
      if (sortDir) ss.setItem('results.sort_dir', sortDir);
    } catch {}
  }, [sortKpi, sortDir]);

  // Leggo i filtri dalla query
  const { brand, brands, model, models, teat_size, teat_sizes, barrel_shape, parlor, areas, ...rest } = router.query;

  const toListParam = (v) =>
    Array.isArray(v)
      ? v.map(String)
      : (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

  const brandsListFromQuery = useMemo(
    () => (toListParam(brands).length ? toListParam(brands) : toListParam(brand)),
    [brands, brand]
  );

  const modelsListFromQuery = useMemo(
    () => (toListParam(models).length ? toListParam(models) : toListParam(model)),
    [models, model]
  );

  const buildBrandModelFilters = (sourceItems = []) => {
    const brandsSelected = [...brandsListFromQuery];
    const modelsSelected = [...new Set(modelsListFromQuery)];
    const modelsByBrand = {};

    if (brandsSelected.length === 1 && modelsSelected.length > 0) {
      modelsByBrand[brandsSelected[0]] = modelsSelected;
    } else if (modelsSelected.length > 0) {
      // Preserve "model-only" filters by inferring brand->models from visible results.
      const wanted = new Set(modelsSelected.map(String));
      (Array.isArray(sourceItems) ? sourceItems : []).forEach((it) => {
        const b = it?.brand ? String(it.brand) : "";
        const m = it?.model ? String(it.model) : "";
        if (!b || !m || !wanted.has(m)) return;
        if (!Array.isArray(modelsByBrand[b])) modelsByBrand[b] = [];
        if (!modelsByBrand[b].includes(m)) modelsByBrand[b].push(m);
      });
    }

    return { brands: brandsSelected, models: modelsByBrand };
  };

  const kpis = useMemo(() => {
    // tutti i parametri che iniziano con kpi e hanno un valore
    return Object.entries(rest)
      .filter(([k, v]) => k.toLowerCase().startsWith("kpi") && v)
      .map(([, v]) => String(v));
  }, [rest]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then((u) => setMe(u))
      .catch(() => {
        window.location.replace("/login");
      });
  }, []);

  const onSaveSearch = async () => {
    try {
      const t = getToken();
      if (!t) { window.location.replace("/login"); return; }
      if (!saveName.trim()) { toast({ status: "warning", title: "Inserisci un nome" }); return; }
      // Build filters object compatible with ProductFilters
      const areasSel = typeof areas === "string" && areas ? String(areas).split(",") : [];
      const brandModelFilters = buildBrandModelFilters(items);
      const teatSel = (() => {
        const acc = [];
        if (Array.isArray(teat_sizes)) acc.push(...teat_sizes.map(String));
        else if (typeof teat_sizes === 'string') acc.push(...teat_sizes.split(',').map(s=>s.trim()).filter(Boolean));
        if (teat_size) acc.push(String(teat_size));
        return [...new Set(acc)];
      })();
      const shapesSel = (() => {
        if (Array.isArray(barrel_shape)) return barrel_shape.map(String);
        if (typeof barrel_shape === 'string' && barrel_shape.includes(',')) return barrel_shape.split(',').map(s=>s.trim()).filter(Boolean);
        return barrel_shape ? [String(barrel_shape)] : [];
      })();
      const payload = {
        areas: areasSel,
        brandModel: brandModelFilters,
        teatSizes: teatSel,
        shapes: shapesSel,
        parlor: parlor ? [String(parlor)] : [],
      };
      await saveProductPref(t, saveName.trim(), payload);
      toast({ status: "success", title: "Preference saved" });
      setSaveName("");
      saveCtrl.onClose();
    } catch (e) {
      toast({ status: "error", title: e?.message || "Unable to save" });
    }
  };

  const filterSig = useMemo(() => {
    const {
      page: _page,
      sort: _sort,
      sortDir: _sortDir,
      sort_kpi: _sortKpi,
      sort_dir: _sortDirAlt,
      ...rest
    } = router.query || {};
    const keys = Object.keys(rest).sort();
    return JSON.stringify(keys.map(k => [k, rest[k]]));
  }, [router.query]);
  const pinnedStorageKey = useMemo(() => `results.pinned_key.${filterSig}`, [filterSig]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const saved = window.sessionStorage.getItem(pinnedStorageKey);
      if (!saved) {
        setPinnedKeys([]);
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        setPinnedKeys(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [String(parsed)]);
      } catch {
        setPinnedKeys([saved]);
      }
    } catch {}
  }, [pinnedStorageKey]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (pinnedKeys.length) window.sessionStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedKeys));
      else window.sessionStorage.removeItem(pinnedStorageKey);
    } catch {}
  }, [pinnedKeys, pinnedStorageKey]);

  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      const t = getToken();
      if (!t) return;
      setLoading(true);
      // Build filter lists from query (support single or CSV values).
      const toList = (v) => Array.isArray(v) ? v.map(String) : (typeof v === 'string' ? v.split(',').map(s=>s.trim()).filter(Boolean) : []);
      const brandsList = (toList(brands).length ? toList(brands) : toList(brand));
      const modelsList = (toList(models).length ? toList(models) : toList(model));

      // fetch products (avoid sending brand+model together, backend treats them as AND)
      const serverFilters = { limit: 500 };
      if (brandsList.length === 1 && modelsList.length === 0) serverFilters.brand = brandsList[0];
      if (modelsList.length === 1 && brandsList.length === 0) serverFilters.model = modelsList[0];
      const base = await listProducts(t, serverFilters).catch(() => []);

      // filter client-side for brand/model/shape/parlor/areas
      const shapes = (() => {
        if (Array.isArray(barrel_shape)) return barrel_shape.map(String);
        if (typeof barrel_shape === 'string' && barrel_shape.includes(',')) return barrel_shape.split(',').map(s => s.trim()).filter(Boolean);
        return barrel_shape ? [String(barrel_shape)] : [];
      })();
      const parlorSel = parlor ? [String(parlor)] : [];
      const areasSel = typeof areas === "string" && areas ? String(areas).split(",") : [];

      const filtered = (Array.isArray(base) ? base : []).filter((p) => {
        let okBM = true;
        if (brandsList.length > 0 || modelsList.length > 0) {
          const hasBrand = p.brand && brandsList.includes(String(p.brand));
          const hasModel = p.model && modelsList.includes(String(p.model));
          okBM = hasBrand || hasModel;
        }
        let okShape = true;
        if (shapes.length > 0) okShape = p.barrel_shape && shapes.includes(String(p.barrel_shape));
        let okParlor = true;
        if (parlorSel[0] === "robot") okParlor = !!p.robot_liner;
        if (parlorSel[0] === "conventional") okParlor = !p.robot_liner;
        let okArea = true;
        if (areasSel.length > 0 && !areasSel.includes("Global")) {
          const list = Array.isArray(p.reference_areas) ? p.reference_areas : [];
          okArea = areasSel.some((a) => list.includes(a));
        }
        return okBM && okShape && okParlor && okArea;
      });

      // expand by teat sizes (support single, CSV, or teat_sizes param)
      const sizes = (() => {
        const acc = [];
        if (Array.isArray(teat_size)) acc.push(...teat_size.map(String));
        else if (typeof teat_size === 'string') {
          if (teat_size.includes(',')) acc.push(...teat_size.split(',').map(s=>s.trim()).filter(Boolean));
          else acc.push(String(teat_size));
        }
        if (Array.isArray(teat_sizes)) acc.push(...teat_sizes.map(String));
        else if (typeof teat_sizes === 'string') acc.push(...teat_sizes.split(',').map(s=>s.trim()).filter(Boolean));
        const uniq = [...new Set(acc)];
        return uniq.length ? uniq : ["40","50","60","70"];
      })();
      const apps = [];
      filtered.forEach((p) => {
        sizes.forEach((s) => {
          apps.push({ key: `${p.id}-${s}`,
                      product_id: p.id,
                      brand: p.brand,
                      model: p.model,
                      compound: p.compound,
                      barrel_shape: p.barrel_shape,
                      size_mm: s });
        });
      });
      setItems(apps);
      // reset sorting caches only when filters change (not on page change)
      setAppIdByKey({});
      setKpiScores({});
      setLoading(false);
    };
    run();
  }, [router.isReady, filterSig]);

  // sort items if a KPI is selected
  const sortedItems = useMemo(() => {
    if (!sortKpi) return items;
    const dir = sortDir === 'asc' ? 1 : -1; // asc: low→high, desc: high→low
    const copy = [...items];
    copy.sort((a, b) => {
      const sa = kpiScores[a.key]?.[sortKpi]?.score ?? -Infinity;
      const sb = kpiScores[b.key]?.[sortKpi]?.score ?? -Infinity;
      // numeric compare of scores with direction
      return (sa - sb) * dir;
    });
    return copy;
  }, [items, kpiScores, sortKpi, sortDir]);
  const pinnedItems = useMemo(
    () => pinnedKeys
      .map((key) => sortedItems.find((it) => it.key === key))
      .filter(Boolean),
    [sortedItems, pinnedKeys]
  );
  useEffect(() => {
    if (!pinnedKeys.length) return;
    const available = new Set(sortedItems.map((it) => it.key));
    const next = pinnedKeys.filter((key) => available.has(key));
    if (next.length !== pinnedKeys.length) {
      setPinnedKeys(next);
    }
  }, [pinnedKeys, sortedItems]);

  useEffect(() => {
    if (!pinnedItems.length) {
      setShowPinnedOverlay(false);
      return;
    }

    const updatePinnedOverlay = () => {
      const node = resultsTableRef.current;
      if (!node) {
        setShowPinnedOverlay(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const overlayTop = window.innerWidth < 768 ? 10 : 12;
      const overlayHeight = 76 * pinnedItems.length;
      setShowPinnedOverlay(rect.top <= overlayTop && rect.bottom > overlayTop + overlayHeight);
    };

    updatePinnedOverlay();
    window.addEventListener("scroll", updatePinnedOverlay, { passive: true });
    window.addEventListener("resize", updatePinnedOverlay);

    return () => {
      window.removeEventListener("scroll", updatePinnedOverlay);
      window.removeEventListener("resize", updatePinnedOverlay);
    };
  }, [pinnedItems]);

  // Removed URL sync of sort/visibility for performance

  // Build product application map (size -> app id) for all products
  const buildApplicationsMap = async (token, list) => {
    const byKey = {};
    const byProduct = new Map();
    const uniqProducts = [...new Set(list.map(i => i.product_id))];
    try {
      const grouped = await listProductApplicationsBatchByProducts(token, uniqProducts);
      uniqProducts.forEach((pid) => {
        byProduct.set(pid, Array.isArray(grouped?.[String(pid)]) ? grouped[String(pid)] : []);
      });
    } catch {
      // Fallback to per-product calls if batch endpoint is temporarily unavailable.
      await Promise.all(uniqProducts.map(async (pid) => {
        try {
          const apps = await getProductApplicationsCached(token, pid);
          byProduct.set(pid, apps || []);
        } catch {}
      }));
    }
    for (const it of list) {
      const apps = byProduct.get(it.product_id) || [];
      const found = apps.find(a => Number(a.size_mm) === Number(it.size_mm));
      if (found) byKey[it.key] = found.id;
    }
    return byKey;
  };

  const mergeScoresFromBatch = (prevScores, batchMap, keyByAppId) => {
    const next = { ...prevScores };
    Object.entries(batchMap || {}).forEach(([appIdRaw, values]) => {
      const key = keyByAppId[Number(appIdRaw)];
      if (!key) return;
      const latest = latestKpiByCode(Array.isArray(values) ? values : []);
      const byCode = Object.fromEntries(
        Object.entries(latest).map(([code, v]) => [code, { score: v.score, value_num: v.value_num }])
      );
      next[key] = { ...(next[key] || {}), ...byCode };
    });
    return next;
  };

  // Build key->application map once per filter result set.
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!items.length) return;
      const token = getToken();
      if (!token) return;
      try {
        const map = await buildApplicationsMap(token, items);
        if (!alive) return;
        setAppIdByKey((prev) => ({ ...prev, ...map }));
      } catch {}
    };
    run();
    return () => { alive = false; };
  }, [items]);

  async function ensureScoresFor(sortCode) {
    const token = getToken();
    if (!token) return;
    setSortingBusy(true);
    try {
      // applications map
      let appMap = appIdByKey;
      if (!Object.keys(appMap).length) {
        appMap = await buildApplicationsMap(token, items);
        setAppIdByKey(appMap);
      }

      // fetch KPI values for keys missing this sortCode
      const missingKeys = items.filter(i => !(kpiScores[i.key]?.[sortCode])).map(i => i.key);
      const missingAppIds = missingKeys.map((key) => appMap[key]).filter(Boolean);
      if (!missingAppIds.length) return;
      const keyByAppId = Object.fromEntries(
        missingKeys
          .map((key) => [appMap[key], key])
          .filter(([appId]) => !!appId)
      );
      const batch = await getKpiValuesBatch(token, missingAppIds);
      setKpiScores((prev) => mergeScoresFromBatch(prev, batch, keyByAppId));
    } finally {
      setSortingBusy(false);
    }
  }

  // Load KPI values for all rows in one batch request.
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!sortedItems.length) return;
      const token = getToken();
      if (!token) return;
      const keys = sortedItems.map((it) => it.key);
      const missingKeys = keys.filter((key) => !kpiScores[key]);
      if (!missingKeys.length) return;
      const appIds = missingKeys.map((key) => appIdByKey[key]).filter(Boolean);
      if (!appIds.length) return;
      const keyByAppId = Object.fromEntries(
        missingKeys
          .map((key) => [appIdByKey[key], key])
          .filter(([appId]) => !!appId)
      );
      try {
        const batch = await getKpiValuesBatch(token, appIds);
        if (!alive) return;
        setKpiScores((prev) => mergeScoresFromBatch(prev, batch, keyByAppId));
      } catch {}
    };
    run();
    return () => { alive = false; };
  }, [sortedItems, appIdByKey, kpiScores]);

  const onSelectSortKpi = async (code) => {
    // Default to descending when a KPI is selected
    setSortDir('desc');
    setSortKpi(code);
    await ensureScoresFor(code);
  };

  const toggleSortDir = () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));

  const togglePinnedKey = (key) => {
    setPinnedKeys((prev) => (
      prev.includes(key)
        ? prev.filter((itemKey) => itemKey !== key)
        : [...prev, key]
    ));
  };

  const openDetails = (item) => {
    const q = new URLSearchParams({ brand: String(item?.brand || ""), model: String(item?.model || "") });
    if (item?.size_mm != null) q.set("teat_size", String(item.size_mm));
    const from = encodeURIComponent(router.asPath || "/product/result");
    router.push(`/idcard/idresult?${q.toString()}&from=${from}`);
  };

  // Reusable selection modal state (for action buttons)
  const [selOpen, setSelOpen] = useState(false);
  const [selConfig, setSelConfig] = useState({ title: "", min: 1, max: 5, route: "/tools/radar-map" });
  const [selSearch, setSelSearch] = useState("");
  const [selSelected, setSelSelected] = useState(new Set()); // stores application keys
  const [selSubmitting, setSelSubmitting] = useState(false);
  const filteredList = useMemo(() => {
    const q = (selSearch || "").toLowerCase();
    const base = Array.isArray(items) ? items : [];
    if (!q) return base;
    return base.filter(it => (`${it.brand || ""} ${it.model || ""}`).toLowerCase().includes(q));
  }, [items, selSearch]);
  const selCount = selSelected.size;
  const exact = selConfig.min === selConfig.max;
  const isValidSel = exact ? (selCount === selConfig.min) : (selCount >= selConfig.min && selCount <= selConfig.max);
  const selTitle = selConfig.title || (exact ? `Select exactly ${selConfig.min} products` : `Select ${selConfig.min}-${selConfig.max} products`);
  const openAction = (cfg) => {
    setSelConfig(cfg);
    setSelSelected(new Set());
    setSelSearch("");
    setSelOpen(true);
  };
  const toggleSel = (key) => {
    setSelSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const confirmSel = async () => {
    if (!isValidSel || selSubmitting) return;
    setSelSubmitting(true);
    try {
      const keys = Array.from(selSelected);
      // Navigate immediately with keys to avoid blocking on heavy app-id mapping.
      // If ids are already available in cache, include them too.
      const appIds = keys.map((k) => appIdByKey[k]).filter(Boolean);
      const params = new URLSearchParams();
      if (appIds.length === keys.length) params.set("app_ids", appIds.join(","));
      if (keys.length) params.set("keys", keys.join(","));
      const from = encodeURIComponent(router.asPath || "/product/result");
      params.set("from", from);
      await router.push(`${selConfig.route}?${params.toString()}`);
      setSelOpen(false);
    } catch (e) {
      toast({
        status: "error",
        title: "Unable to continue",
        description: e?.message || "Please try again.",
      });
    } finally {
      setSelSubmitting(false);
    }
  };

  // Quando vorrai collegare il backend:
  // 1) scommenta la useEffect sotto
  // 2) implementa la fetch verso il tuo endpoint di ricerca
  //
  // useEffect(() => {
  //   if (!router.isReady) return;
  //   const t = getToken();
  //   if (!t) return;
  //
  //   setLoading(true);
  //   const params = new URLSearchParams(router.query as Record<string, string>);
  //   fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/search?${params.toString()}`, {
  //     headers: { Authorization: `Bearer ${t}` },
  //   })
  //     .then(r => r.ok ? r.json() : Promise.reject(r))
  //     .then(data => setItems(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])))
  //     .catch(() => toast({ status: "error", title: "Errore nel caricamento dei risultati" }))
  //     .finally(() => setLoading(false));
  // }, [router.isReady, router.query, toast]);

  if (!me) return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
      <Spinner size="xl" thickness="4px" color="blue.500" />
    </Box>
  );

  // Build display lists for summary (brand/model/teat sizes may arrive as CSV under different keys)
  const brandsList = brandsListFromQuery;
  const modelsList = modelsListFromQuery;
  const teatsList = (toListParam(teat_sizes).length ? toListParam(teat_sizes) : toListParam(teat_size));

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Search Results"
        subtitle="Filters summary and product search results."
        backHref="/product"
      />

      <Box as="main" flex="1" w="100%" px={{ base: 0, md: 0 }} pt={{ base: 4, md: 6 }}>
        {showPinnedOverlay ? (
          pinnedItems.map((item, index) => (
            <PinnedLinerOverlay
              key={item.key}
              item={item}
              index={index}
              kpiScores={kpiScores}
              appIdByKey={appIdByKey}
              isAdmin={me?.role === 'admin'}
              onUnpin={() => togglePinnedKey(item.key)}
              onOpenDetails={openDetails}
            />
          ))
        ) : null}

        {(() => {
          const areasSel = typeof areas === "string" && areas ? String(areas).split(",") : [];
          const shapesList = (() => {
            if (Array.isArray(barrel_shape)) return barrel_shape.map(String);
            if (typeof barrel_shape === 'string' && barrel_shape.includes(',')) return barrel_shape.split(',').map(s => s.trim()).filter(Boolean);
            return barrel_shape ? [String(barrel_shape)] : [];
          })();

            const onEditFilters = () => {
              const preset = {
                areas: areasSel,
                brandModel: buildBrandModelFilters(items),
                teatSizes: teatsList,
                shapes: shapesList,
                parlor: parlor ? [String(parlor)] : [],
              };
            const encoded = encodeURIComponent(JSON.stringify(preset));
            router.push(`/product?preset=${encoded}`);
          };
          return (
            <FiltersSummaryCard
              brand={brandsList}
              model={modelsList}
              teat_size={teatsList}
              areas={areasSel}
              barrel_shape={barrel_shape}
              parlor={parlor}
              kpis={kpis}
              onEdit={onEditFilters}
              onSave={saveCtrl.onOpen}
            />
          );
        })()}

        {/* Action buttons */}
        <SimpleGrid columns={isAdmin ? { base: 3, md: 3 } : { base: 2, md: 2 }} gap={3} mb={0}>
          <Button
            variant="outline"
            px={{ base: 2, md: 3 }}
            pt={{ base: 4, md: 2 }}
            pb={{ base: 4, md: 2 }}
            minH={{ base: 14, md: 'auto' }}
            onClick={() => openAction({ title: "Radar Map", min: 1, max: 5, route: "/tools/radar-map" })}
          >
            <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
              <Box as={TbChartRadar} boxSize={{ base: 6, md: 5 }} color="blue.500" />
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Radar Map</Text>
            </Stack>
          </Button>
          {isAdmin ? (
            <Button
              variant="outline"
              px={{ base: 2, md: 3 }}
              pt={{ base: 4, md: 2 }}
              pb={{ base: 4, md: 2 }}
              minH={{ base: 14, md: 'auto' }}
              onClick={() => openAction({ title: "Tests Detail", min: 1, max: 8, route: "/tools/tests-detail" })}
            >
              <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
                <Box as={RiFlaskLine} boxSize={{ base: 6, md: 5 }} color="blue.500" />
                <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Tests Detail</Text>
              </Stack>
            </Button>
          ) : null}
          <Button
            variant="outline"
            px={{ base: 2, md: 3 }}
            pt={{ base: 4, md: 2 }}
            pb={{ base: 4, md: 2 }}
            minH={{ base: 14, md: 'auto' }}
            onClick={() => openAction({ title: "Select 1 or 2 products", min: 1, max: 2, route: "/tools/setting-calculator" })}
          >
            <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
              <Box as={TbArrowsRightLeft} boxSize={{ base: 6, md: 5 }} color="blue.500" />
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Setting Calculator</Text>
            </Stack>
          </Button>
        </SimpleGrid>

        {/* Risultati */}
        <Card mt={{ base: 8, md: 10 }} mx={{ base: 0, md: 0 }} px={{ base: 0, md: 0 }} rounded={{ base: 'md', md: 'none' }} boxShadow="none">
          <CardBody pt={0} px={{ base: 0, md: 0 }}>
            {loading ? (
              <VStack py={10} spacing={3}>
                <Spinner />
                <Text color="gray.600">Loading applications…</Text>
              </VStack>
            ) : items.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">No results.</Text>
              </VStack>
            ) : (
              <>
                <Box ref={resultsTableRef}>
                  <LinerResultsTable
                    rows={sortedItems}
                    total={items.length}
                    sortKpi={sortKpi}
                    sortDir={sortDir}
                    sortingBusy={sortingBusy}
                    kpiScores={kpiScores}
                    appIdByKey={appIdByKey}
                    isAdmin={me?.role === 'admin'}
                    pinnedKeys={pinnedKeys}
                    onTogglePin={togglePinnedKey}
                    onOpenDetails={openDetails}
                    onSelectSortKpi={onSelectSortKpi}
                    onToggleDir={toggleSortDir}
                  />
                </Box>
              </>
            )}
          </CardBody>
        </Card>
      </Box>

      <AppFooter appName="Liner Characteristic App" />

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

      {/* Selection modal (reusable for the three actions) */}
      <Modal isOpen={selOpen} onClose={() => setSelOpen(false)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selTitle}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Input placeholder="Search brand or model" value={selSearch} onChange={(e)=>setSelSearch(e.target.value)} />
              <Box maxH="320px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
                <VStack align="stretch" spacing={2}>
                  {filteredList.map(it => (
                    <HStack key={it.key} justify="space-between">
                      <Text fontSize="sm">
                        {it.brand} {it.model} • {formatTeatSize(it.size_mm)}{it.size_mm ? ` (${it.size_mm} mm)` : ""}
                      </Text>
                      <input type="checkbox" checked={selSelected.has(it.key)} onChange={() => toggleSel(it.key)} />
                    </HStack>
                  ))}
                  {filteredList.length === 0 && (
                    <Text fontSize="sm" color="gray.500">No products found.</Text>
                  )}
                </VStack>
              </Box>
              <HStack justify="space-between">
                <Text fontSize="sm">Selected: {selCount}</Text>
                {!isValidSel && (
                  <Text fontSize="sm" color="red.500">
                    {exact ? `Select exactly ${selConfig.min} products` : `Select between ${selConfig.min} and ${selConfig.max} products`}
                  </Text>
                )}
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack w="full" justify="space-between">
              <Button variant="ghost" onClick={() => setSelOpen(false)}>Cancel</Button>
              <Button colorScheme="blue" onClick={confirmSel} isDisabled={!isValidSel || selSubmitting} isLoading={selSubmitting}>Confirm</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

