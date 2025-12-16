// pages/idcard/idresult.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Text, HStack, VStack, Button,
  Card, CardBody, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton
} from "@chakra-ui/react";
import { TbListDetails, TbGauge } from "react-icons/tb";
import { RiFlaskLine } from "react-icons/ri";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { getToken } from "../../lib/auth";
import { getMe, listProducts } from "../../lib/api";
import DetailsTab from "../../components/idcard/DetailsTab";
import KpisTab from "../../components/idcard/KpisTab";
import TestsTab from "../../components/idcard/TestsTab";

export default function IdResultPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const imgModal = useDisclosure();

  const { brand, model, teat_size, from } = router.query;
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  

  // quali campi saltare nella tabella “specs”
  

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(setMe).catch(() => {
      toast({ status: "error", title: "Sessione scaduta" });
      window.location.replace("/login");
    });
  }, [toast]);

  useEffect(() => {
    (async () => {
      if (!me || !router.isReady) return;
      const t = getToken(); if (!t) return;

      if (!model) {
        toast({ status: "warning", title: "No model selected." });
        router.replace("/product/result");
        return;
      }

      try {
        setLoading(true);
        const items = await listProducts(t, { brand, model, limit: 1 });
        const p = Array.isArray(items) ? items[0] : null;
        if (!p) {
          toast({ status: "info", title: "No products found for the selected filters." });
        }
        setProduct(p || null);
      } catch (e) {
        toast({ status: "error", title: "Error loading product." });
      } finally {
        setLoading(false);
      }
    })();
  }, [me, router.isReady, brand, model, toast, router]);

  if (!me) return <Box p={6}>Caricamento…</Box>;

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title={product?.model || ""}
        subtitle={product?.brand ? `Product belonging to the ${product.brand} brand` : ""}
        backHref={backHref}
        showInfo={false}
      />

      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base:2, md:8 }} pt={{ base:2, md:6 }} w="100%">
        {/* Dettaglio prodotto */}
        <Card
          w="100%"
          ml={{ base: 0, md: 0 }}
          mr={{ base: 0, md: 0 }}
          borderWidth={0}
          rounded={{ base: "none", md: "md" }}
          boxShadow={{ base: "none", md: "sm" }}
        >
          <CardBody pt={{ base: 2, md: 3 }}>
            {loading ? (
              <Text py={8} color="gray.600">Caricamento…</Text>
            ) : !product ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.600">Nessun prodotto corrispondente.</Text>
                <Button onClick={() => router.push(backHref)} variant="outline">Torna ai risultati</Button>
              </VStack>
            ) : (
              <>
                {/* Tabs: Details | KPIs | Tests */}
                <Tabs colorScheme="blue" mt={{ base: 1, md: 2 }} w="100%" isFitted variant="enclosed">
                  <TabList borderRadius="md" borderWidth="1px" overflow="hidden" bg="gray.50">
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={TbListDetails} /> <Text>Details</Text></HStack>
                    </Tab>
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={TbGauge} /> <Text>KPIs</Text></HStack>
                    </Tab>
                    <Tab fontWeight="semibold">
                      <HStack spacing={2}><Box as={RiFlaskLine} /> <Text>Tests</Text></HStack>
                    </Tab>
                  </TabList>
                  <TabPanels w="100%">
                    <TabPanel px={0} w="100%">
                      <DetailsTab product={product} onOpenImage={imgModal.onOpen} />
                    </TabPanel>
                    <TabPanel w="100%">
                      <KpisTab product={product} isAdmin={me?.is_admin} />
                    </TabPanel>
                    <TabPanel w="100%">
                      <TestsTab product={product} unitSystem={me?.unit_system} />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </>
            )}
          </CardBody>
        </Card>
      </Box>

      <AppFooter appName="Liner Characteristic App" />

      {/* Full image modal */}
      <Modal isOpen={imgModal.isOpen} onClose={imgModal.onClose} size="6xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            <Box as="img" src="/liner.png" alt="Liner" maxH="85vh" maxW="95vw" objectFit="contain" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
