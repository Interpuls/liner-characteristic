// pages/admin/tests.js
import { useEffect, useState } from "react";
import {
  Box, Heading, HStack, VStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  Card, CardBody, SimpleGrid, Text, Badge, Icon, Tooltip,
  Collapse, useDisclosure, OrderedList, UnorderedList, ListItem
} from "@chakra-ui/react";
import { ChevronDownIcon, WarningTwoIcon, InfoOutlineIcon } from "@chakra-ui/icons";
import { LuFlaskConical, LuListChecks } from "react-icons/lu";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

import AppHeader from "@/components/AppHeader";
import FancySelect from "@/components/ui/FancySelect";

import { BackHomeIcon } from "../../components/ui/BackHomeIcon";
import { getToken } from "@/lib/auth";
import { listProducts, getProduct, listProductApplications } from "@/lib/api";

const L = ({ children }) => <Text fontSize="xs" color="gray.500" mb={1}>{children}</Text>;

// Box descrittivo collassabile usato sotto ogni Tab. Default aperto.
function InfoBox({ title = "Descrizione", children, defaultOpen = true }) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: defaultOpen });
  return (
    <Box
      mb={4}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="gray.50"
      overflow="hidden"
    >
      <HStack
        as="button"
        type="button"
        onClick={onToggle}
        w="full"
        justify="space-between"
        px={3}
        py={2}
        _hover={{ bg: "gray.100" }}
        transition="background-color 0.15s"
      >
        <HStack spacing={2}>
          <Icon as={InfoOutlineIcon} color="gray.600" />
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            {title}
          </Text>
        </HStack>
        <Icon
          as={ChevronDownIcon}
          boxSize={5}
          color="gray.600"
          transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
          transition="transform 0.2s"
        />
      </HStack>
      <Collapse in={isOpen} animateOpacity>
        <Box
          px={4}
          py={3}
          bg="white"
          borderTop="1px solid"
          borderColor="gray.200"
          fontSize="sm"
          color="gray.700"
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

// Box collassabile per procedure / avvertenze. Ogni step può essere una stringa
// oppure { text, sub: string[] } per supportare sotto-elenchi puntati.
function ProcedureBox({
  title = "Procedura di test",
  steps = [],
  colorScheme = "orange",
  icon: IconComp = LuListChecks,
  defaultOpen = false,
}) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: defaultOpen });
  const cs = colorScheme;
  return (
    <Box
      mb={4}
      borderWidth="1px"
      borderColor={`${cs}.200`}
      borderRadius="md"
      bg={`${cs}.50`}
      overflow="hidden"
    >
      <HStack
        as="button"
        type="button"
        onClick={onToggle}
        w="full"
        justify="space-between"
        px={3}
        py={2}
        _hover={{ bg: `${cs}.100` }}
        transition="background-color 0.15s"
      >
        <HStack spacing={2}>
          <Icon as={IconComp} color={`${cs}.600`} />
          <Text fontSize="sm" fontWeight="semibold" color={`${cs}.800`}>
            {title}
          </Text>
        </HStack>
        <Icon
          as={ChevronDownIcon}
          boxSize={5}
          color={`${cs}.700`}
          transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
          transition="transform 0.2s"
        />
      </HStack>
      <Collapse in={isOpen} animateOpacity>
        <Box
          px={4}
          py={3}
          bg="white"
          borderTop="1px solid"
          borderColor={`${cs}.200`}
        >
          <OrderedList spacing={1.5} fontSize="sm" color="gray.700" pl={4}>
            {steps.map((s, i) => {
              if (typeof s === "string") return <ListItem key={i}>{s}</ListItem>;
              return (
                <ListItem key={i}>
                  {s.text}
                  {Array.isArray(s.sub) && s.sub.length > 0 && (
                    <UnorderedList mt={1} spacing={0.5} pl={4}>
                      {s.sub.map((b, j) => (
                        <ListItem key={j}>{b}</ListItem>
                      ))}
                    </UnorderedList>
                  )}
                </ListItem>
              );
            })}
          </OrderedList>
        </Box>
      </Collapse>
    </Box>
  );
}

const PRECHECK_STEPS = [
  "Accendere il pressostato e svolgere la verifica dopo 15 min che è stato acceso.",
  "Verificare che la pressione del guanto sia 10±1 kPa.",
  "Prendere una guaina IP15 di riferimento.",
  {
    text: "Settare:",
    sub: [
      "vuoto 45 kPa sia pulsazione che interno alla guaina",
      "65 ppm e rapporto 65/35",
      "effettuare un listato con capezzolo 70 mm",
    ],
  },
  {
    text: "Verificare che:",
    sub: [
      "l'intensità di massaggio letta sia 25±1 kPa",
      "il valore minimo letto in pulsazione sia -30 kPa",
      "il valore massimo letto in pulsazione sia -5 kPa",
    ],
  },
  "Se i valori al punto 5 non corrispondono allora occorre riempire nuovamente l'attrezzatura prestando attenzione che NON si formino bolle d'aria (scuotendola si sente).",
  "Ripetere la verifica dai punti 1-5.",
];

const TPP_STEPS = [
  "Posizionare il capezzolo per la sua lunghezza 40-50-60-70 mm.",
  "Pompare con la pompetta a mano fino a rilevare un aumento della pressione letta dal pressostato digitale pari a +0,2 kPa rispetto al valore di partenza.",
  "Rilevare il valore di pressione pompata nella camera di pulsazione del cannello, che corrisponde al TPP reale per quella lunghezza di capezzolo.",
];

const MASSAGE_STEPS = [
  "Allestire l'attrezzatura “GUANTO” in modo da potere accogliere la guaina.",
  "Impostare un vuoto di pulsazione come da tabella sotto.",
  "Impostare un vuoto all'interno della guaina come da tabella sotto.",
  "Collegare il Vadia all'attrezzatura “GUANTO”.",
  "Impostare pulsazione e frequenza a 65 ppm rapporto 65/35.",
  "Collegare un tubo di pulsazione alla guaina.",
  "Effettuare un listato di pulsazione di 1 minuto con il Vadia ripetendolo 3 volte per guaina.",
  "Testare tutte le versioni come da tabella.",
  "Compilare la tabella andando ad inserire i valori massimi e minimi di pressione rilevati dal Vadia (che rappresentano pressione massima e minima applicate al capezzolo).",
];

const SPEED_STEPS = [
  "Posizionare la guaina sotto il capezzolo della lunghezza definita.",
  "Collegare il tubo corto del latte della guaina ad un secchio, a sua volta collegato alla linea del vuoto.",
  "Collegare il pulsatore alla guaina.",
  "Settare un vuoto di 45 kPa, Freq 65 ppm, Rapporto 65/35.",
  "Posizionare la cannuccia di pescaggio diametro 4 mm (flusso 2,5 l/min @45 kPa), nella testa della guaina.",
  "Avviare il test che dovrà durare 1 min facendo pescare acqua dalla bacinella.",
  "Al termine del minuto occorrerà andare a pesare la quantità di acqua risucchiata dalla guaina.",
];

const SMT_HOOD_STEPS = [
  "Piazzarsi con l'attrezzatura capezzolo.",
  "Collegare alla guaina un tubo in rilsan in modo da generare un flusso d'acqua come indicato in tabella (tre valori 0,5 – 1,9 – 3,6 l/min @45 kPa).",
  "Settare il vuoto d'impianto a 45 kPa.",
  "Settare frequenza e rapporto a 65 ppm 65/35.",
  "Collegare il Vadia — Sensore 1 = Pulsazione; Sensore 3 = SMT; Sensore 4 = Hoodcup.",
  "Effettuare lettura dinamica del massaggio e compilare i vuoti max e min per ciascun canale.",
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

function BarrelShapeBadge({ shape }) {
  const key = (shape || "").toLowerCase();
  const ShapeIcon = BARREL_SHAPE_ICON[key];
  if (!ShapeIcon) return null;
  return (
    <Tooltip label={`Barrel shape: ${BARREL_SHAPE_LABEL[key]}`} hasArrow placement="top">
      <Box as="span" display="inline-flex" alignItems="center">
        <ShapeIcon boxSize={5} color="gray.600" />
      </Box>
    </Tooltip>
  );
}

function ProductSpecsCard({ product }) {
  if (!product) return null;
  const V = ({ label, value, unit }) => (
    <Box>
      <L>{label}</L>
      <Text>{value ?? "—"}{value != null && unit ? ` ${unit}` : ""}</Text>
    </Box>
  );
  return (
    <Card mb={4} variant="outline">
      <CardBody>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Badge colorScheme="blue" variant="subtle" borderRadius="md">Product</Badge>
            <Text fontWeight="semibold">
              {(product.brand ? `${product.brand} ` : "") + (product.model || product.name || `#${product.id}`)}
            </Text>
            <BarrelShapeBadge shape={product.barrel_shape} />
          </HStack>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <V label="MP depth" value={product.mp_depth_mm} unit="mm" />
          <V label="Orifice Ø" value={product.orifice_diameter} unit="mm" />
          <V label="Hoodcup Ø" value={product.hoodcup_diameter} unit="mm" />
          <V label="Return → lockring" value={product.return_to_lockring} unit="mm" />
          <V label="Lockring Ø" value={product.lockring_diameter} unit="mm" />
          <V label="Overall length" value={product.overall_length} unit="mm" />
          <V label="Milk tube ID" value={product.milk_tube_id} unit="mm" />
          <V label="Barrel wall th." value={product.barrell_wall_thickness} unit="mm" />
          <V label="Barrel conicity" value={product.barrell_conicity} />
          <V label="Hardness" value={product.hardness} />
          <V label="Shell Orifice" value={product.shell_orifice} />
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}

export default function AdminTests() {
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [pid, setPid] = useState("");
  const [product, setProduct] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    setToken(t);
    (async () => {
      try {
        const rows = await listProducts(t, { product_type: "liner", limit: 100 });
        const items = Array.isArray(rows) ? rows : (rows?.items ?? []);
        setProducts(items);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token || !pid) { setProduct(null); setApps([]); return; }
    (async () => {
      try {
        const [p, pas] = await Promise.all([
          getProduct(token, pid),
          listProductApplications(token, pid),
        ]);
        setProduct(p || null);
        setApps(Array.isArray(pas) ? pas.sort((a,b)=>a.size_mm-b.size_mm) : []);
      } catch {
        setProduct(null); setApps([]);
      }
    })();
  }, [pid, token]);

  return (
    <>
      <AppHeader
        title="Tests Campaign"
        subtitle="Laboratory workspace on your selected product."
        leftIcon={LuFlaskConical}
        backHref="/"
        showInfo={false}
      />
      <Box as="main" maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} pt={4}>
        
      {/* Selettore prodotto (unico per tutti i tab) */}
      <Card mb={3}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <L>Select product</L>
              <FancySelect
                placeholder="Choose a product"
                value={pid}
                onChange={(val) => setPid(val)}
                options={products.map((p) => ({
                  value: String(p.id),
                  label: (p.brand ? `${p.brand} ` : "") + (p.model || p.name || `#${p.id}`) + (p.compound ? ` (${p.compound})` : ""),
                }))}
                w="full"
              />
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Scheda specifiche del prodotto selezionato */}
      {pid && <ProductSpecsCard product={product} />}

      {/* Avvertenza condivisa: verifica preliminare prima di qualsiasi test */}
      <ProcedureBox
        title="ATTENZIONE - Verifica preliminare gonfiaggio del capezzolo"
        steps={PRECHECK_STEPS}
        colorScheme="red"
        icon={WarningTwoIcon}
      />

      {/* Tabs */}
      <Tabs variant="unstyled">
        <TabList
          overflowX="auto"
          borderBottom="1px solid"
          borderColor="gray.200"
          css={{
            scrollbarWidth: "none",      /* Firefox */
            msOverflowStyle: "none",     /* IE/Edge */
            "&::-webkit-scrollbar": { display: "none" }, /* Chrome/Safari */
          }}
        >
          {["TPP", "Massage", "Speed", "SMT / Hood"].map((label) => (
            <Tab
              key={label}
              borderBottom="2px solid transparent"
              borderRadius="0"
              px={4}
              py={3}
              mr={2}
              whiteSpace="nowrap"
              _selected={{
                color: "blue.600",
                fontWeight: "bold",
                borderBottomColor: "blue.500",
              }}
              _focus={{ boxShadow: "none" }}
            >
              {label}
            </Tab>
          ))}
        </TabList>
        
        <TabPanels>
          <TabPanel px={0} pt={4}>
            <InfoBox title="Descrizione test - TPP">
              <Text>
                TPP — Calcola il KPI “Closure” partendo dal valore reale di TPP.
                Seleziona il prodotto, poi per ciascuna misura inserisci il Real TPP (mm)
                e premi “Save & Compute”.
              </Text>
            </InfoBox>
            <ProcedureBox title="Procedura di test - TPP" steps={TPP_STEPS} />
            <TppTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox title="Descrizione test - Massage">
              <Text mb={2}>
                Questa prova ha lo scopo di mappare l&apos;intensità di massaggio della guaina
                al variare delle condizioni di vuoto.
              </Text>
              <Text mb={1}>
                Attraverso questo test si otterranno i tre seguenti KPI della guaina:
              </Text>
              <UnorderedList spacing={1} pl={4}>
                <ListItem>
                  La mappatura dell&apos;intensità di massaggio di ciascuna guaina al variare
                  del vuoto di impianto e del vuoto nella guaina stessa.
                </ListItem>
                <ListItem>
                  Uno score sulla capacità di accogliere il capezzolo (sotto test) delle varie guaine.
                </ListItem>
                <ListItem>
                  Uno score dell&apos;intensità di massaggio inteso come valore assoluto.
                </ListItem>
              </UnorderedList>
            </InfoBox>
            <ProcedureBox title="Procedura di test - Massage" steps={MASSAGE_STEPS} />
            <AdminMassageTest token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox title="Descrizione test - Speed">
              <Text>
                La prova ha lo scopo di misurare la capacità di evacuazione di una guaina.
              </Text>
            </InfoBox>
            <ProcedureBox title="Procedura di test - Speed" steps={SPEED_STEPS} />
            <SpeedTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <InfoBox title="Descrizione test - SMT / Hood">
              <Text mb={2}>
                La prova ha lo scopo di andare a mappare le fluttuazioni nella testa della
                guaina e nel tubo corto del latte, andando a simulare una mungitura con acqua.
              </Text>
              <Text mb={1}>Verranno quindi assegnati questi KPI:</Text>
              <UnorderedList spacing={1} pl={4}>
                <ListItem>Fluttuazioni Hoodcup</ListItem>
                <ListItem>Fluttuazioni SMT</ListItem>
              </UnorderedList>
            </InfoBox>
            <ProcedureBox title="Procedura di test - SMT / Hood" steps={SMT_HOOD_STEPS} />
            <SmtHoodTestPage token={token} pid={pid} product={product} apps={apps} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
    </>
  );
}
