import { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Divider, Checkbox, Textarea, Text
} from "@chakra-ui/react";

export default function ProductModal({ isOpen, onClose, meta, onSave }) {
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({
    brand: "",
    model: "",
    compound: "STD",
    manufactured_at: "",         
    only_admin: true,           
    notes: "",

    // technical specs (all optional)
    mp_depth_mm: null,
    orifice_diameter: null,
    hoodcup_diameter: null,
    return_to_lockring: null,
    lockring_diameter: null,
    overall_length: null,
    milk_tube_id: null,
    barrell_wall_thickness: null,
    barrell_conicity: null,
    hardness: null,
  });

  const handleChange = (field, value) => {
    setNewProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleVisibleChange = (e) => {
    const checked = e.target.checked;
    setNewProduct(prev => ({ ...prev, only_admin: !checked }));
  };
  const handleNumberChange = (field, value) => {
    const parsed = value === "" ? null : parseFloat(String(value).replace(",", "."));
    setNewProduct((prev) => ({ ...prev, [field]: Number.isNaN(parsed) ? null : parsed }));
  };
  const handleCheckbox = (field) => (e) => {
    setNewProduct((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // normalizza date vuota a null
      const payload = {
        ...newProduct,
        manufactured_at: newProduct.manufactured_at || null,
        notes: newProduct.notes?.trim() || null,
      };
      await onSave(payload);
      onClose();
      // reset
      setNewProduct({
        brand: "",
        model: "",
        compound: "STD",
        manufactured_at: "",
        only_admin: false,
        notes: "",
        mp_depth_mm: null,
        orifice_diameter: null,
        hoodcup_diameter: null,
        return_to_lockring: null,
        lockring_diameter: null,
        overall_length: null,
        milk_tube_id: null,
        barrell_wall_thickness: null,
        barrell_conicity: null,
        hardness: null,
      });
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !newProduct.brand || !newProduct.model || !newProduct.compound;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create product</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
            {/* Brand (required) */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.600">Brand</FormLabel>
              <Input
                list="brand-options"
                placeholder="Type or choose a brand"
                value={newProduct.brand}
                onChange={(e)=>handleChange("brand", e.target.value)}
              />
              <datalist id="brand-options">
                {(meta?.brands || []).map(v => <option key={v} value={v} />)}
              </datalist>
            </FormControl>

            {/* Model (required) */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.600">Model</FormLabel>
              <Input
                list="model-options"
                placeholder="Type or choose a model"
                value={newProduct.model}
                onChange={(e)=>handleChange("model", e.target.value)}
              />
              <datalist id="model-options">
                {(meta?.models || []).map(v => <option key={v} value={v} />)}
              </datalist>
            </FormControl>

            {/* Compound (required) */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.600">Compound</FormLabel>
              <Input
                list="compound-options"
                value={newProduct.compound}
                onChange={(e)=>handleChange("compound", e.target.value.toUpperCase())}
                placeholder="Type or choose a compound (e.g. STD)"
              />
              <datalist id="compound-options">
                {(meta?.compounds || []).map(v => <option key={v} value={v} />)}
              </datalist>
            </FormControl>

            {/* Manufactured at */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Manufactured at</FormLabel>
              <Input
                type="date"
                value={newProduct.manufactured_at}
                onChange={(e)=>handleChange("manufactured_at", e.target.value)}
              />
            </FormControl>

            {/* Only admin */}
            <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
              <Checkbox
                isChecked={!newProduct.only_admin}
                onChange={handleVisibleChange}
              >
                Visible to users
              </Checkbox>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Only one public variant per Brand/Model. Creating another public one will be rejected.
              </Text>
            </FormControl>

            {/* Notes */}
            <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
              <FormLabel fontSize="sm" color="gray.600">Notes</FormLabel>
              <Textarea
                placeholder="Optional notes for testers"
                value={newProduct.notes}
                onChange={(e)=>handleChange("notes", e.target.value)}
                rows={3}
              />
            </FormControl>
          </SimpleGrid>

          <Divider my={2} mb={6}/>

          <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">Technical specifications</Text>
          <SimpleGrid columns={{ base:1, md:2 }} gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">MP depth (mm)</FormLabel>
              <Input type="number" value={newProduct.mp_depth_mm ?? ""} onChange={(e)=>handleNumberChange("mp_depth_mm", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Orifice diameter (mm)</FormLabel>
              <Input type="number" value={newProduct.orifice_diameter ?? ""} onChange={(e)=>handleNumberChange("orifice_diameter", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Hoodcup diameter (mm)</FormLabel>
              <Input type="number" value={newProduct.hoodcup_diameter ?? ""} onChange={(e)=>handleNumberChange("hoodcup_diameter", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Return to lockring (mm)</FormLabel>
              <Input type="number" value={newProduct.return_to_lockring ?? ""} onChange={(e)=>handleNumberChange("return_to_lockring", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Lockring diameter (mm)</FormLabel>
              <Input type="number" value={newProduct.lockring_diameter ?? ""} onChange={(e)=>handleNumberChange("lockring_diameter", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Overall length (mm)</FormLabel>
              <Input type="number" value={newProduct.overall_length ?? ""} onChange={(e)=>handleNumberChange("overall_length", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Milk tube ID (mm)</FormLabel>
              <Input type="number" value={newProduct.milk_tube_id ?? ""} onChange={(e)=>handleNumberChange("milk_tube_id", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Barrel wall thickness (mm)</FormLabel>
              <Input type="number" value={newProduct.barrell_wall_thickness ?? ""} onChange={(e)=>handleNumberChange("barrell_wall_thickness", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Barrel conicity</FormLabel>
              <Input type="number" value={newProduct.barrell_conicity ?? ""} onChange={(e)=>handleNumberChange("barrell_conicity", e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Hardness</FormLabel>
              <Input type="number" value={newProduct.hardness ?? ""} onChange={(e)=>handleNumberChange("hardness", e.target.value)} />
            </FormControl>
          </SimpleGrid>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSave} isDisabled={isDisabled} isLoading={saving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
