import NextLink from "next/link";
import {
  Box, Heading, HStack, Button, Tabs, TabList, TabPanels, Tab, TabPanel
} from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

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
          <TabPanel px={0} pt={4}>
            <AdminMassageTest />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <SpeedTestPage />
          </TabPanel>
          <TabPanel px={0} pt={4}>
            <SmtHoodTestPage />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}