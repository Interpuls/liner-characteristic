import { Box, Text, VStack } from "@chakra-ui/react";

export default function HoodcupTab({ selected = [] }) {
  return (
    <VStack align="stretch" spacing={3} w="100%">
      <Text fontWeight="semibold">Hoodcup Fluctuation</Text>
      <Box fontSize="sm" color="gray.600">
        Selected: {selected.length ? selected.join(", ") : "none"}
      </Box>
      {/* TODO: implement charts and details */}
      <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" color="gray.600">
        Placeholder for Hoodcup fluctuation charts and metrics
      </Box>
    </VStack>
  );
}

