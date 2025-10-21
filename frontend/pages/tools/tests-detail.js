import { useRouter } from "next/router";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";

export default function TestsDetailPage() {
  const router = useRouter();
  const { app_ids, ids, keys, from } = router.query;
  const list = typeof app_ids === 'string' && app_ids ? app_ids.split(',').filter(Boolean)
              : (typeof ids === 'string' && ids ? ids.split(',').filter(Boolean) : (typeof keys === 'string' ? keys.split(',').filter(Boolean) : []));
  const backHref = typeof from === 'string' && from ? decodeURIComponent(from) : "/product/result";

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Tests Detail" subtitle="Dettagli test per prodotti" backHref={backHref} />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base:4, md:8 }} pt={{ base:4, md:6 }}>
        <VStack align="start" spacing={3}>
          <Heading size="md">Selezionati</Heading>
          <Text fontSize="sm">Selected: {list.join(', ') || 'none'}</Text>
          {/* TODO: implement tests detail UI */}
        </VStack>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
