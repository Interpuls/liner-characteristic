import { Box, Card, CardBody, Heading, Text, VStack } from "@chakra-ui/react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

export default function InformationPage() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Information" subtitle="Application notes and support contacts" backHref="/home" />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }} w="100%">
        <Card>
          <CardBody>
            <VStack align="start" spacing={3}>
              <Heading size="md">Liner Lens</Heading>
              <Text color="gray.700">
                This page is reserved for product documentation and usage notes.
              </Text>
              <Text color="gray.700">
                For support, contact the platform administrator.
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
