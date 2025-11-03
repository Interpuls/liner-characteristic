import { Box, VStack, Text } from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";

export default function TestsTab() {
  return (
    <VStack spacing={3} py={2} align="center" color="gray.600">
      <Box as={RiFlaskLine} boxSize={8} />
      <Text>Tests coming soon.</Text>
    </VStack>
  );
}

