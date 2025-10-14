import { useEffect, useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Wrap, WrapItem, Tag, TagLabel, Button, HStack, Box, Divider
} from "@chakra-ui/react";

export default function ChipSelectFilterModal({
  isOpen,
  onClose,
  title,
  options = [],
  value = [],
  onChange,
  single = false,
  count,
  loading,
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { if (isOpen) setLocal(value); }, [isOpen, value]);

  const toggle = (opt) => {
    if (single) {
      setLocal((prev) => (prev && prev[0] === opt ? [] : [opt]));
    } else {
      setLocal((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]));
    }
  };

  const handleApply = () => { onChange(local); onClose(); };
  const handleReset = () => setLocal([]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Wrap spacing={2}>
            {options.map((opt) => (
              <WrapItem key={opt}>
                <Tag
                  size="lg"
                  variant={local.includes(opt) ? "solid" : "subtle"}
                  colorScheme={local.includes(opt) ? "blue" : undefined}
                  cursor="pointer"
                  onClick={() => toggle(opt)}
                >
                  <TagLabel>{opt}</TagLabel>
                </Tag>
              </WrapItem>
            ))}
          </Wrap>

          <Box position="sticky" bottom={0} bg="white" pt={4} mt={4}>
            <Divider mb={3} />
            <HStack justify="space-between">
              <Button variant="ghost" onClick={handleReset}>Reset</Button>
              <Button colorScheme="blue" onClick={handleApply} isLoading={loading}>Conferma</Button>
            </HStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
