import { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Divider, Checkbox, Textarea, Text,
  Image, Box, InputGroup, InputLeftAddon  
} from "@chakra-ui/react";
import ProductFields from "./ProductFields";

export default function ProductModal({ isOpen, onClose, meta, onSave }) {
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({
    brand: "",
    model: "",
    compound: "STD",
    manufactured_at: "", 
    shell_type: null, 
    wash_cup: null, 
    spider_wash_cup: null,        
    only_admin: true,           
    notes: "",
    robot_liner: false,
    barrel_shape: "",
    reference_areas: null,

    // technical specs
    liner_length: null,
    mp_depth_mm: null,
    orifice_diameter: null,
    barrel_diameter: null,
    shell_orifice: null,
    shell_length: null, 
    shell_external_diameter: null,
    hoodcup_diameter: null,
    return_to_lockring: null,
    lockring_diameter: null,
    overall_length: null,
    milk_tube_id: null,
    barrell_wall_thickness: null,
    barrell_conicity: null,
    hardness: null,
  });

  const handleChange = (field, value) => setNewProduct((prev) => ({ ...prev, [field]: value }));
  const handleNumberChange = (field, value) => {
    const parsed = value === "" ? null : parseFloat(String(value).replace(",", "."));
    setNewProduct((prev) => ({ ...prev, [field]: Number.isNaN(parsed) ? null : parsed }));
  };
  const handleVisibleChange = (checked) => setNewProduct(prev => ({ ...prev, only_admin: !checked }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...newProduct,
        manufactured_at: newProduct.manufactured_at || null,
        notes: newProduct.notes?.trim() || null,
      };
      await onSave(payload);
      onClose();
      setNewProduct({
        brand: "",
        model: "",
        compound: "STD",
        shell_type: null, 
        wash_cup: null, 
        spider_wash_cup: null,
        manufactured_at: "",
        only_admin: false,
        notes: "",
        robot_liner: false,
        barrel_shape: "",
        reference_areas: null,
        liner_length: null,
        barrel_diameter: null,
        shell_orifice: null,
        shell_length: null, 
        shell_external_diameter: null,
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
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontWeight="normal">Create product</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ProductFields
            values={newProduct}
            meta={meta}
            onChange={handleChange}
            onNumberChange={handleNumberChange}
            onVisibleChange={handleVisibleChange}
          />
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
