import { useRouter } from "next/router";
import { Box, Heading, Text, VStack, Card, CardHeader, CardBody } from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";

export default function RadarMapPage() {
  const router = useRouter();
  const { app_ids, ids, keys, from } = router.query;
  const list = typeof app_ids === 'string' && app_ids ? app_ids.split(',').filter(Boolean)
              : (typeof ids === 'string' && ids ? ids.split(',').filter(Boolean) : (typeof keys === 'string' ? keys.split(',').filter(Boolean) : []));
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Radar Map" subtitle="Confronto prodotti" backHref={backHref} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} w="100%" mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        <Card mx={{ base: -4, md: 0 }}>
          <CardHeader py={3}>
            <Heading size="sm">Radar Map</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <VStack align="start" spacing={3}>
              <Text fontSize="sm">Selected: {list.join(', ') || 'none'}</Text>
              {/* TODO: implement radar visualization */}
            </VStack>
          </CardBody>
        </Card>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
