import { useEffect, useMemo, useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Checkbox, CheckboxGroup, Stack, Button, Box, HStack, Text, Divider
} from "@chakra-ui/react";

const ALL_AREAS = [
  "Global",
  "North America",
  "South America",
  "Europe",
  "Africa",
  "China",
  "Middle East",
  "Far East",
  "Oceania",
];

export default function ReferenceAreaFilterModal({ isOpen, onClose, value = [], onChange, count, loading }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { if (isOpen) setLocal(value); }, [isOpen, value]);

  const isGlobal = local.includes("Global");
  const options = useMemo(() => ALL_AREAS, []);

  const handleToggle = (val) => {
    if (val.includes("Global")) {
      setLocal(["Global"]);
      return;
    }
    setLocal(val.filter((v) => v !== "Global"));
  };

  const handleApply = () => {
    onChange(local);
    onClose();
  };

  const handleReset = () => setLocal([]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Reference Area</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <CheckboxGroup value={local} onChange={handleToggle}>
            <Stack spacing={3}>
              {options.map((o) => (
                <Checkbox key={o} value={o} isDisabled={isGlobal && o !== "Global"}>{o}</Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>

          <Box position="sticky" bottom={0} bg="white" pt={4} mt={4}>
            <Divider mb={3} />
            <HStack justify="space-between">
              <Button variant="ghost" onClick={handleReset}>Reset</Button>
              <Button colorScheme="blue" onClick={handleApply} isLoading={loading}>
                Conferma
              </Button>
            </HStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
