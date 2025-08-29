// components/ProductModal.js
import { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Text, Divider
} from "@chakra-ui/react";

export default function ProductModal({ isOpen, onClose, meta, onSave }) {
  const [newProduct, setNewProduct] = useState({
    brand: "",
    model: "",
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
  const handleNumberChange = (field, value) => {
    const parsed = value === "" ? null : parseFloat(value);
    setNewProduct((prev) => ({ ...prev, [field]: parsed }));
  };

  const handleSave = () => {
    onSave(newProduct);        // product_type sarà assegnato dal backend a 'liner'
    onClose();
    // reset
    setNewProduct({
      brand: "",
      model: "",
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
  };

  const isDisabled = !newProduct.brand || !newProduct.model;

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

            {/* Model (required, acts as product name) */}
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
          </SimpleGrid>

          <Divider my={2} mb={6}/>

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
          <Button colorScheme="blue" onClick={handleSave} isDisabled={isDisabled}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
