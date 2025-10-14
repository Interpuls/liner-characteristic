import { HStack, Box, Text, Icon, Button, Spacer } from "@chakra-ui/react";
import { FiChevronRight } from "react-icons/fi";

export default function FilterRow({ icon, label, summary, onClick }) {
  const IconComp = icon;
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      justifyContent="flex-start"
      w="full"
      py={4}
      px={2}
      _hover={{ bg: "gray.50" }}
      _active={{ bg: "gray.100" }}
    >
      <HStack w="full" spacing={3}>
        {IconComp ? <Icon as={IconComp} boxSize={5} color="gray.600" /> : null}
        <Text fontWeight="medium">{label}</Text>
        <Spacer />
        {summary ? (
          <Text color="gray.500" fontSize="sm" noOfLines={1} maxW="50%" textAlign="right">
            {summary}
          </Text>
        ) : null}
        <Icon as={FiChevronRight} color="gray.400" />
      </HStack>
    </Button>
  );
}

