import { Card, CardHeader, CardBody, Heading, Stack, HStack, Tag, TagLabel, Button, Text } from "@chakra-ui/react";

function toList(val) {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

export default function FiltersSummaryCard({ brand, model, teat_size, areas = [], barrel_shape, parlor, kpis = [], onEdit, onSave }) {
  const brandsList = toList(brand);
  const modelsList = toList(model);
  const teatList = toList(teat_size);
  const areasList = Array.isArray(areas) ? areas : toList(areas);
  const shapesList = toList(barrel_shape);
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
          {brandsList.length > 0 ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Brand: {brandsList.join(", ")}</TagLabel></Tag>
          ) : null}
          {modelsList.length > 0 ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Model: {modelsList.join(", ")}</TagLabel></Tag>
          ) : null}
          {teatList.length > 0 ? (
            <Tag size="md" colorScheme="blue"><TagLabel>Teat size: {teatList.join(", ")}</TagLabel></Tag>
          ) : null}
          {areasList.length > 0 ? (
            <Tag size="md" colorScheme="cyan"><TagLabel>Reference area: {areasList.join(", ")}</TagLabel></Tag>
          ) : null}
          {shapesList.length > 0 ? (
            <Tag size="md" colorScheme="orange"><TagLabel>Barrel shape: {shapesList.join(", ")}</TagLabel></Tag>
          ) : null}
          {parlor ? (
            <Tag size="md" colorScheme="pink"><TagLabel>Parlor: {parlor}</TagLabel></Tag>
          ) : null}
          {kpis.length ? (
            <HStack gap={2} wrap="wrap">
              {kpis.map((k, i) => (
                <Tag key={i} size="md" colorScheme="purple"><TagLabel>KPI: {k}</TagLabel></Tag>
              ))}
            </HStack>
          ) : null}

          {(brandsList.length === 0 && modelsList.length === 0 && teatList.length === 0 && areasList.length === 0 && shapesList.length === 0 && !parlor && kpis.length === 0) && (
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
