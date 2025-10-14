import { useEffect, useMemo, useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Checkbox, Stack, HStack, Button, Box, Divider, Text, Spinner
} from "@chakra-ui/react";
import { getToken } from "../../lib/auth";
import { getModelsByBrand } from "../../lib/api";

export default function BrandModelFilterModal({ isOpen, onClose, brands = [], value, onChange, count, loading }) {
  // value = { brands: Set<string>, models: Record<brand, Set<model>> }
  const [selBrands, setSelBrands] = useState(new Set());
  const [selModels, setSelModels] = useState({});
  const [modelsByBrand, setModelsByBrand] = useState({});
  const [loadingBrand, setLoadingBrand] = useState({});

  useEffect(() => {
    if (isOpen) {
      setSelBrands(new Set(value?.brands || []));
      // clone sets for local state
      const mm = {};
      Object.entries(value?.models || {}).forEach(([b, set]) => { mm[b] = new Set(Array.from(set)); });
      setSelModels(mm);
    }
  }, [isOpen, value]);

  const loadModels = async (brand) => {
    if (modelsByBrand[brand] || loadingBrand[brand] === true) return;
    try {
      setLoadingBrand((s) => ({ ...s, [brand]: true }));
      const t = getToken();
      const res = await getModelsByBrand(t, brand);
      setModelsByBrand((m) => ({ ...m, [brand]: res || [] }));
    } catch {
      setModelsByBrand((m) => ({ ...m, [brand]: [] }));
    } finally {
      setLoadingBrand((s) => ({ ...s, [brand]: false }));
    }
  };

  const toggleBrand = (brand, checked) => {
    const nb = new Set(selBrands);
    if (checked) {
      nb.add(brand);
      // selecting brand implies select all its models
      const all = new Set(modelsByBrand[brand] || []);
      setSelModels((m) => ({ ...m, [brand]: all }));
    } else {
      nb.delete(brand);
      setSelModels((m) => ({ ...m, [brand]: new Set() }));
    }
    setSelBrands(nb);
  };

  const toggleModel = (brand, model, checked) => {
    setSelModels((m) => {
      const current = new Set(m[brand] || []);
      if (checked) current.add(model); else current.delete(model);
      return { ...m, [brand]: current };
    });
    // if any model checked -> brand unchecked; if all models checked -> brand checked
    const all = modelsByBrand[brand] || [];
    const selected = new Set((selModels[brand] || new Set()));
    if (checked) selected.add(model); else selected.delete(model);
    const allSelected = all.length > 0 && all.every((md) => selected.has(md));
    const nb = new Set(selBrands);
    if (allSelected) nb.add(brand); else nb.delete(brand);
    setSelBrands(nb);
  };

  const handleApply = () => {
    onChange({ brands: Array.from(selBrands), models: Object.fromEntries(Object.entries(selModels).map(([b, set]) => [b, Array.from(set || [])])) });
    onClose();
  };

  const handleReset = () => { setSelBrands(new Set()); setSelModels({}); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Brand / Model</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Accordion allowMultiple>
            {brands.map((b) => (
              <AccordionItem key={b} border="none">
                <h2>
                  <AccordionButton onClick={() => loadModels(b)} px={0}>
                    <Box as="span" flex="1" textAlign="left">
                      <HStack>
                        <Checkbox isChecked={selBrands.has(b)} onChange={(e) => toggleBrand(b, e.target.checked)}>
                          {b}
                        </Checkbox>
                        {loadingBrand[b] ? <Spinner size="xs" /> : null}
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4} pt={2} px={0}>
                  <Stack pl={6} spacing={2}>
                    {(modelsByBrand[b] || []).map((m) => (
                      <Checkbox key={m}
                        isChecked={(selModels[b] || new Set()).has(m)}
                        onChange={(e) => toggleModel(b, m, e.target.checked)}
                      >
                        {m}
                      </Checkbox>
                    ))}
                    {(modelsByBrand[b] || []).length === 0 && !loadingBrand[b] ? (
                      <Text color="gray.500" fontSize="sm">No models</Text>
                    ) : null}
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>

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
