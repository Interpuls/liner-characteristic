import { Button, HStack, Text, Tag, TagLabel, Icon } from "@chakra-ui/react";

export default function FilterButton({ label, summary, onClick, icon }) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" px={3} py={2}
      rightIcon={summary ? (
        <Tag size="sm" variant="subtle" colorScheme="blue">
          <TagLabel>{summary}</TagLabel>
        </Tag>
      ) : null}
    >
      <HStack>
        {icon ? <Icon as={icon} boxSize={4} color="gray.600" /> : null}
        <Text>{label}</Text>
      </HStack>
    </Button>
  );
}
