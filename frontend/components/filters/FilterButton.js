import { Button, HStack, Text, Tag, TagLabel } from "@chakra-ui/react";

export default function FilterButton({ label, summary, onClick }) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" px={3} py={2}
      rightIcon={summary ? (
        <Tag size="sm" variant="subtle" colorScheme="blue">
          <TagLabel>{summary}</TagLabel>
        </Tag>
      ) : null}
    >
      <HStack>
        <Text>{label}</Text>
      </HStack>
    </Button>
  );
}

