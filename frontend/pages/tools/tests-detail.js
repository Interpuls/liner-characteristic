import { useRouter } from "next/router";
import { Box, Text, VStack, Card, CardBody, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import MassageTab from "../../components/tests-detail/MassageTab";
import HoodcupTab from "../../components/tests-detail/HoodcupTab";
import SmtTab from "../../components/tests-detail/SmtTab";

export default function TestsDetailPage() {
  const router = useRouter();
  const { app_ids, ids, keys, from } = router.query;
  const selectedIds = typeof app_ids === 'string' && app_ids ? app_ids.split(',').filter(Boolean)
                  : (typeof ids === 'string' && ids ? ids.split(',').filter(Boolean) : []);
  const selectedKeys = typeof keys === 'string' && keys ? keys.split(',').filter(Boolean) : [];
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Tests Detail" subtitle="Dettagli test per prodotti" backHref={backHref} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base:2, md:8 }} pt={{ base:2, md:6 }} w="100%">
        <Card w="100%" borderWidth={0} rounded={{ base: "none", md: "md" }} boxShadow={{ base: "none", md: "sm" }}>
          <CardBody pt={{ base: 2, md: 3 }}>
            <Tabs colorScheme="blue" mt={{ base: 1, md: 2 }} w="100%" isFitted variant="enclosed">
              <TabList borderRadius="md" borderWidth="1px" overflow="hidden" bg="gray.50">
                <Tab fontWeight="semibold"><Text>Massage</Text></Tab>
                <Tab fontWeight="semibold"><Text>Hoodcup</Text></Tab>
                <Tab fontWeight="semibold"><Text>SMT</Text></Tab>
              </TabList>
              <TabPanels w="100%">
                <TabPanel px={0} w="100%">
                  <MassageTab selected={selectedIds} selectedKeys={selectedKeys} />
                </TabPanel>
                <TabPanel w="100%">
                  <HoodcupTab selected={selectedIds} />
                </TabPanel>
                <TabPanel w="100%">
                  <SmtTab selected={selectedIds} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
