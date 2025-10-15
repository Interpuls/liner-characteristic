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
      _hover={{ bg: "whiteAlpha.100" }}
      _active={{ bg: "whiteAlpha.200" }}
    >
      <HStack w="full" spacing={3}>
        {IconComp ? <Icon as={IconComp} boxSize={5} color="gray.200" /> : null}
        <Text fontWeight="medium" color="gray.200">{label}</Text>
        <Spacer />
        {summary ? (
          <Text color="gray.300" fontSize="sm" noOfLines={1} maxW="50%" textAlign="right">
            {summary}
          </Text>
        ) : null}
        <Icon as={FiChevronRight} color="gray.300" />
      </HStack>
    </Button>
  );
}
