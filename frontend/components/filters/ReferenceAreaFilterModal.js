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
      <ModalContent backgroundColor="rgba(4, 6, 20, 1)" color="gray.300">
        <ModalHeader color="gray.300">Reference Area</ModalHeader>
        <ModalCloseButton color="gray.300" _hover={{ color: "gray.200" }} />
        <ModalBody pb={4}>
          <CheckboxGroup value={local} onChange={handleToggle}>
            <Stack spacing={3}>
              {options.map((o) => (
                <Checkbox
                  key={o}
                  value={o}
                  isDisabled={isGlobal && o !== "Global"}
                  iconColor="#0c1a3a"
                  sx={{
                    '.chakra-checkbox__control': {
                      bg: 'transparent',
                      borderColor: 'gray.500',
                      _checked: { bg: 'white', borderColor: 'white' },
                    },
                  }}
                >
                  {o}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>

          <Box position="sticky" bottom={0} bg="rgba(4, 6, 20, 0.98)" pt={4} mt={4}>
            <Divider mb={3} borderColor="whiteAlpha.200" />
            <HStack justify="space-between">
              <Button variant="ghost" color="gray.300" _hover={{ color: "gray.200", bg: "whiteAlpha.100" }} onClick={handleReset}>Reset</Button>
              <Button backgroundColor="rgba(28, 31, 54, 1)" color="white" _hover={{ bg: "rgba(32, 35, 60, 1)" }} onClick={handleApply} isLoading={loading}>
                Conferma
              </Button>
            </HStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
