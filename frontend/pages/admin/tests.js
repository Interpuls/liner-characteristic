import NextLink from "next/link";
import {
  Box, Heading, HStack, Button, Tabs, TabList, TabPanels, Tab, TabPanel
} from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";

export default function AdminTests() {
  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      <HStack gap={3} mb={4}>
        <Button as={NextLink} href="/home" variant="outline" size="sm">
          <ChevronLeftIcon mr={1} /> Home
        </Button>
        <Heading size="lg">Tests Campaign</Heading>
      </HStack>

      <Tabs colorScheme="blue">
        <TabList overflowX="auto">
          <Tab>TPP</Tab>
          <Tab>Massage</Tab>
          <Tab>Speed</Tab>
          <Tab>SMT / Hood</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={4}>
            <TppTestPage />
          </TabPanel>
          <TabPanel>
            <AdminMassageTest />
          </TabPanel>
          <TabPanel>
            <SpeedTestPage />
          </TabPanel>
          <TabPanel>
            <Box p={4} color="gray.500">Coming next…</Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}