import { Card, CardHeader, CardBody, Heading, Stack, HStack, Tag, TagLabel, Button, Text } from "@chakra-ui/react";

export default function FiltersSummaryCard({ brand, model, teat_size, kpis = [], onEdit, onSave }) {
  return (
    <Card mb={4}>
      <CardHeader py={3}>
        <HStack justify="space-between" align="center">
          <Heading size="sm">Active filters</Heading>
          <Button onClick={onSave} size="sm" variant="outline" color="#12305f" borderColor="gray.300" _hover={{ bg: "gray.50" }}>
            Save
          </Button>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <Stack direction={{ base: "column", md: "row" }} gap={3} align="flex-start" flexWrap="wrap">
          {brand ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Brand: {brand}</TagLabel></Tag>
          ) : null}
          {model ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Model: {model}</TagLabel></Tag>
          ) : null}
          {teat_size ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Teat size: {teat_size}</TagLabel></Tag>
          ) : null}
          {kpis.length ? (
            <HStack gap={2} wrap="wrap">
              {kpis.map((k, i) => (
                <Tag key={i} size="md" colorScheme="purple"><TagLabel>KPI: {k}</TagLabel></Tag>
              ))}
            </HStack>
          ) : null}

          {(!brand && !model && !teat_size && kpis.length === 0) && (
            <Text color="gray.500" fontSize="sm">No filters selected.</Text>
          )}
        </Stack>

        <HStack mt={4} gap={3}>
          <Button onClick={onEdit} variant="outline">
            Edit filters
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
}

