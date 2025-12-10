import { Box, Text, VStack } from "@chakra-ui/react";

export default function MassageTab({ selected = [] }) {
  return (
    <VStack align="stretch" spacing={3} w="100%">
      <Text fontWeight="semibold">Real TPP and Massage Intensity</Text>
      <Box fontSize="sm" color="gray.600">
        Selected: {selected.length ? selected.join(", ") : "none"}
      </Box>
      {/* TODO: implement charts and details */}
      <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" color="gray.600">
        Placeholder for Massage charts and metrics
      </Box>
    </VStack>
  );
}

