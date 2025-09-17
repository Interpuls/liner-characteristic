import NextLink from "next/link";
import {
  Box, Heading, HStack, Button, Tabs, TabList, TabPanels, Tab, TabPanel
} from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

import TppTestPage from "./tests/tpp";
import AdminMassageTest from "./tests/massage";
import SpeedTestPage from "./tests/speed";
import SmtHoodTestPage from "./tests/smt-hood";

import { BackHomeIcon } from "../../components/ui/BackHomeIcon";

export default function AdminTests() {
  return (
    <Box maxW="6xl" mx="auto" p={{ base:4, md:8 }}>
      <HStack gap={3} mb={4}>
        <BackHomeIcon />
        <Heading size="lg">Tests Campaign</Heading>
      </HStack>

      <Tabs variant="unstyled" colorScheme="blue">
        <TabList
          overflowX="auto"
          whiteSpace="nowrap"
          borderBottom="1px solid"
          borderColor="gray.200"   // linea di base sempre visibile
        >
          {["TPP", "Massage", "Speed", "SMT / Hood"].map((label) => (
            <Tab
              key={label}
              px={4}
              py={3}
              borderBottom="2px solid"
              borderColor="transparent"
              fontWeight="medium"
              _selected={{
                borderColor: "blue.500",   // underline attivo
                color: "blue.600",
                fontWeight: "bold",        // grassetto quando selezionato
              }}
              _hover={{ color: "blue.600" }}
            >
              {label}
            </Tab>
          ))}
        </TabList>
        
        <TabPanels>
          <TabPanel px={0} pt={4}><TppTestPage /></TabPanel>
          <TabPanel px={0} pt={4}><AdminMassageTest /></TabPanel>
          <TabPanel px={0} pt={4}><SpeedTestPage /></TabPanel>
          <TabPanel px={0} pt={4}><SmtHoodTestPage /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}