// pages/products/search.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Heading, Text, HStack, VStack, Stack, Tag, TagLabel, Button,
  Card, CardHeader, CardBody, SimpleGrid, useToast, Badge, Spinner,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input,
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import ProductApplicationCard from "../../components/ProductApplicationCard";
import FiltersSummaryCard from "../../components/result/FiltersSummaryCard";
import ApplicationsHeader from "../../components/result/ApplicationsHeader";
import PaginationBar from "../../components/result/PaginationBar";
import { getToken } from "../../lib/auth";
import { getMe, listProducts, saveProductPref, listProductApplications, getKpiValuesByPA } from "../../lib/api";
import { latestKpiByCode } from "../../lib/kpi";
import { FaChartLine, FaFlask } from "react-icons/fa";

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
  const KPI_ORDER = [
    'CLOSURE','FITTING','CONGESTION_RISK','HYPERKERATOSIS_RISK','SPEED','RESPRAY','FLUYDODINAMIC','SLIPPAGE','RINGING_RISK'
  ];
  // Visible KPI filter removed for performance
  const PAGE_SIZE = 10;
  const initialPage = useMemo(() => {
    const p = Number(router.query.page || 1);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  }, [router.query.page]);
  const [page, setPage] = useState(initialPage);

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
      const brandModelFilters = brand ? { brands: [String(brand)], models: (model ? { [String(brand)]: [String(model)] } : {}) } : { brands: [], models: {} };
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
      toast({ status: "success", title: "Preferenza salvata" });
      setSaveName("");
      saveCtrl.onClose();
    } catch (e) {
      toast({ status: "error", title: e?.message || "Impossibile salvare" });
    }
  };

  const filterSig = useMemo(() => {
    const { page: _page, ...rest } = router.query || {};
    const keys = Object.keys(rest).sort();
    return JSON.stringify(keys.map(k => [k, rest[k]]));
  }, [router.query]);

  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      const t = getToken();
      if (!t) return;
      setLoading(true);
      // fetch products (brand/model filtering supported by backend)
      const base = await listProducts(t, {
        limit: 500,
        ...(brand ? { brand } : {}),
        ...(model ? { model } : {}),
      }).catch(() => []);

      // filter client-side for shape/parlor/areas
      const shapes = (() => {
        if (Array.isArray(barrel_shape)) return barrel_shape.map(String);
        if (typeof barrel_shape === 'string' && barrel_shape.includes(',')) return barrel_shape.split(',').map(s => s.trim()).filter(Boolean);
        return barrel_shape ? [String(barrel_shape)] : [];
      })();
      const parlorSel = parlor ? [String(parlor)] : [];
      const areasSel = typeof areas === "string" && areas ? String(areas).split(",") : [];

      const filtered = (Array.isArray(base) ? base : []).filter((p) => {
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
        return okShape && okParlor && okArea;
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

  // keep page in sync with query
  useEffect(() => { setPage(initialPage); }, [initialPage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / PAGE_SIZE)), [items.length]);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
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
  const pagedItems = useMemo(() => sortedItems.slice(start, end), [sortedItems, start, end]);

  const goToPage = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    const q = new URLSearchParams({ ...router.query, page: String(next) });
    router.replace(`/product/result?${q.toString()}`, undefined, { shallow: true });
  };
  
  // Removed URL sync of sort/visibility for performance

  // Build product application map (size -> app id) for all products
  const buildApplicationsMap = async (token, list) => {
    const byKey = {};
    const byProduct = new Map();
    const uniqProducts = [...new Set(list.map(i => i.product_id))];
    await Promise.all(uniqProducts.map(async (pid) => {
      try {
        const apps = await listProductApplications(token, pid);
        byProduct.set(pid, apps || []);
      } catch {}
    }));
    for (const it of list) {
      const apps = byProduct.get(it.product_id) || [];
      const found = apps.find(a => Number(a.size_mm) === Number(it.size_mm));
      if (found) byKey[it.key] = found.id;
    }
    return byKey;
  };

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
      const newScores = { ...kpiScores };
      await Promise.all(missingKeys.map(async (key) => {
        const appId = appMap[key];
        if (!appId) return;
        try {
          const values = await getKpiValuesByPA(token, appId);
          const latest = latestKpiByCode(values);
          const byCode = Object.fromEntries(Object.entries(latest).map(([code, v]) => [code, { score: v.score, value_num: v.value_num }]));
          newScores[key] = { ...(newScores[key] || {}), ...byCode };
        } catch {}
      }));
      setKpiScores(newScores);
    } finally {
      setSortingBusy(false);
    }
  }

  const onSelectSortKpi = async (code) => {
    // Default to descending when a KPI is selected
    setSortDir('desc');
    setSortKpi(code);
    await ensureScoresFor(code);
  };

  const toggleSortDir = () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));

  // Reusable selection modal state (for action buttons)
  const [selOpen, setSelOpen] = useState(false);
  const [selConfig, setSelConfig] = useState({ title: "", min: 1, max: 5, route: "/tools/radar-map" });
  const [selSearch, setSelSearch] = useState("");
  const [selSelected, setSelSelected] = useState(new Set()); // stores application keys
  const filteredList = useMemo(() => {
    const q = (selSearch || "").toLowerCase();
    const base = Array.isArray(items) ? items : [];
    if (!q) return base;
    return base.filter(it => (`${it.brand || ""} ${it.model || ""}`).toLowerCase().includes(q));
  }, [items, selSearch]);
  const selCount = selSelected.size;
  const exact = selConfig.min === selConfig.max;
  const isValidSel = exact ? (selCount === selConfig.min) : (selCount >= selConfig.min && selCount <= selConfig.max);
  const selTitle = exact ? `Select exactly ${selConfig.min} products` : `Select ${selConfig.min}-${selConfig.max} products`;
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
    if (!isValidSel) return;
    // Ensure we have an applications map (key -> application_id)
    let appMap = appIdByKey;
    if (!Object.keys(appMap).length) {
      const token = getToken();
      if (token) {
        appMap = await buildApplicationsMap(token, items);
        setAppIdByKey(appMap);
      }
    }
    const keys = Array.from(selSelected);
    const appIds = keys.map(k => appMap[k]).filter(Boolean);
    const param = appIds.length ? `app_ids=${appIds.join(',')}` : `keys=${keys.join(',')}`;
    const from = encodeURIComponent(router.asPath || "/product/result");
    router.push(`${selConfig.route}?${param}&from=${from}`);
    setSelOpen(false);
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
  const toList = (v) => Array.isArray(v) ? v.map(String) : (typeof v === 'string' ? v.split(',').map(s=>s.trim()).filter(Boolean) : []);
  const brandsList = (toList(brands).length ? toList(brands) : toList(brand));
  const modelsList = (toList(models).length ? toList(models) : toList(model));
  const teatsList = (toList(teat_sizes).length ? toList(teat_sizes) : toList(teat_size));

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Search Results"
        subtitle="Filters summary and product search results."
        backHref="/product"
      />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "100%" }} mx="auto" px={{ base: 4, md: 0 }} pt={{ base: 4, md: 6 }}>
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
              brandModel: {
                brands: brandsList,
                models: (brandsList.length === 1 && modelsList.length > 0) ? { [brandsList[0]]: modelsList } : {},
              },
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
        <SimpleGrid columns={{ base: 3, md: 3 }} gap={3} mb={4}>
          <Button
            variant="outline"
            px={{ base: 2, md: 3 }}
            pt={{ base: 4, md: 2 }}
            pb={{ base: 4, md: 2 }}
            minH={{ base: 14, md: 'auto' }}
            onClick={() => openAction({ title: "Radar Map", min: 1, max: 5, route: "/tools/radar-map" })}
          >
            <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
              <Box as={FaChartLine} boxSize={{ base: 5, md: 4 }} color="#12305f" />
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Radar Map</Text>
            </Stack>
          </Button>
          <Button
            variant="outline"
            px={{ base: 2, md: 3 }}
            pt={{ base: 4, md: 2 }}
            pb={{ base: 4, md: 2 }}
            minH={{ base: 14, md: 'auto' }}
            onClick={() => openAction({ title: "Tests Detail", min: 1, max: 5, route: "/tools/tests-detail" })}
          >
            <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
              <Box as={FaFlask} boxSize={{ base: 5, md: 4 }} color="#12305f" />
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Tests Detail</Text>
            </Stack>
          </Button>
          <Button
            variant="outline"
            px={{ base: 2, md: 3 }}
            pt={{ base: 4, md: 2 }}
            pb={{ base: 4, md: 2 }}
            minH={{ base: 14, md: 'auto' }}
            onClick={() => openAction({ title: "Setting Calculator", min: 2, max: 2, route: "/tools/setting-calculator" })}
          >
            <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={{ base: 1, md: 2 }}>
              {/* Custom VS icon */}
              <Box w={{ base: 6, md: 6 }} h={{ base: 6, md: 6 }} borderRadius="full" borderWidth="1px" borderColor="#12305f" color="#12305f" display="flex" alignItems="center" justifyContent="center" fontWeight="bold" fontSize={{ base: 'xs', md: 'sm' }}>
                VS
              </Box>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">Setting Calculator</Text>
            </Stack>
          </Button>
        </SimpleGrid>

        {/* Risultati */}
        <Card mx={{ base: -4, md: 0 }}>
          <CardHeader py={3}>
            <ApplicationsHeader
              total={items.length}
              sortKpi={sortKpi}
              sortDir={sortDir}
              sortingBusy={sortingBusy}
              onSelectSortKpi={onSelectSortKpi}
              onToggleDir={toggleSortDir}
            />
          </CardHeader>
          <CardBody pt={0}>
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
                <SimpleGrid columns={{ base: 1, md: 1 }} gap={4}>
                  {pagedItems.map((a) => (
                    <ProductApplicationCard
                      key={a.key}
                      productId={a.product_id}
                      brand={a.brand}
                      model={a.model}
                      compound={a.compound}
                      isAdmin={me?.role === 'admin'}
                      sizeMm={a.size_mm}
                    />
                  ))}
                </SimpleGrid>
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => goToPage(page - 1)}
                  onNext={() => goToPage(page + 1)}
                />
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
                      <Text fontSize="sm">{it.brand} {it.model} • {it.size_mm} mm</Text>
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
              <Button colorScheme="blue" onClick={confirmSel} isDisabled={!isValidSel}>Confirm</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
