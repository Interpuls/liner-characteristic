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
      <ModalContent backgroundColor="rgba(4, 6, 20, 1)" color="gray.300">
        <ModalHeader color="gray.300">{title}</ModalHeader>
        <ModalCloseButton color="gray.300" _hover={{ color: "gray.200" }} />
        <ModalBody pb={4}>
          <Wrap spacing={2}>
            {options.map((opt) => (
              <WrapItem key={opt}>
                <Tag
                  size="lg"
                  bg={local.includes(opt) ? "white" : "whiteAlpha.100"}
                  color={local.includes(opt) ? "#0c1a3a" : "gray.300"}
                  borderWidth={local.includes(opt) ? "0" : "1px"}
                  borderColor={local.includes(opt) ? "transparent" : "whiteAlpha.300"}
                  cursor="pointer"
                  onClick={() => toggle(opt)}
                  _hover={{ bg: local.includes(opt) ? "white" : "whiteAlpha.200" }}
                >
                  <TagLabel>{opt}</TagLabel>
                </Tag>
              </WrapItem>
            ))}
          </Wrap>

          <Box position="sticky" bottom={0} bg="rgba(4, 6, 20, 0.98)" pt={4} mt={4}>
            <Divider mb={3} borderColor="whiteAlpha.200" />
            <HStack justify="space-between">
              <Button variant="ghost" color="gray.300" _hover={{ color: "gray.200", bg: "whiteAlpha.100" }} onClick={handleReset}>Reset</Button>
              <Button backgroundColor="rgba(28, 31, 54, 1)" color="white" _hover={{ bg: "rgba(32, 35, 60, 1)" }} onClick={handleApply} isLoading={loading}>Confirm</Button>
            </HStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
