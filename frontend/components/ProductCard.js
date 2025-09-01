// components/ProductCard.js
import {
  Card, CardBody, Heading, Tag, TagLabel,
  IconButton, Button, HStack, Box
} from "@chakra-ui/react";
import { EditIcon, ChevronRightIcon } from "@chakra-ui/icons";

export default function ProductCard({ p, onEdit, onDetail }) {
  const title = p.model || p.name || "Product";
  return (
    <Card variant="outline" position="relative">
      <IconButton
        aria-label="Edit product"
        icon={<EditIcon />}
        size="sm"
        variant="ghost"
        position="absolute"
        top={2}
        right={2}
        onClick={() => onEdit?.(p)}
      />
      <CardBody pt={4} pb={4}>
        <Heading size="md" mb={2}>{title}</Heading>
        {p.brand && (
          <Tag size="sm" variant="subtle">
            <TagLabel>{p.brand}</TagLabel>
          </Tag>
        )}

        <HStack justify="flex-end" mt={4}>
          <Button colorScheme="gray" size="sm" onClick={() => onDetail?.(p)} rightIcon={<ChevronRightIcon/>}>
            Detail
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
}
