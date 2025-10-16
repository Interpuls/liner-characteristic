import { HStack, Button, Tag, TagLabel } from "@chakra-ui/react";

export default function PaginationBar({ page = 1, totalPages = 1, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <HStack mt={4} justify="center" spacing={3}>
      <Button size="sm" onClick={() => onPrev && onPrev()} isDisabled={page <= 1}>Prev</Button>
      <Tag size="sm" variant="subtle"><TagLabel>Page {page} / {totalPages}</TagLabel></Tag>
      <Button size="sm" onClick={() => onNext && onNext()} isDisabled={page >= totalPages}>Next</Button>
    </HStack>
  );
}

