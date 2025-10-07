import { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Divider, Checkbox, Textarea, Text,
  Image, Box, InputGroup, InputLeftAddon  
} from "@chakra-ui/react";

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

    // technical specs (all optional)
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
        shell_type: null, 
        wash_cup: null, 
        spider_wash_cup: null,
        manufactured_at: "",
        only_admin: false,
        notes: "",
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
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create product</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base:1, md:3 }} gap={4} mb={6}>
            {/* Brand (required) */}
            <FormControl isRequired mb={2}>
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
            <FormControl isRequired mb={2}>
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
            <FormControl isRequired mb={2}>
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

            {/* Shell Type */}
            <FormControl mb={2}>
              <FormLabel fontSize="sm" color="gray.600">Shell Type</FormLabel>
              <Input
                type="number"
                value={newProduct.shell_type}
                onChange={(e)=>handleChange("shell_type", e.target.value)}
                placeholder="Type shell type"
              />
            </FormControl>

            {/* Wash Cup */}
            <FormControl mb={2}>
              <FormLabel fontSize="sm" color="gray.600">Wash cup</FormLabel>
              <Input
                type="number"
                value={newProduct.wash_cup}
                onChange={(e)=>handleChange("wash_cup", e.target.value)}
                placeholder="Type wash cup"
              />
            </FormControl>

            {/* Spider Wash Cup */}
            <FormControl mb={2}>
              <FormLabel fontSize="sm" color="gray.600">Spider Wash Cup</FormLabel>
              <Input
                type="number"
                value={newProduct.spider_wash_cup}
                onChange={(e)=>handleChange("spider_wash_cup", e.target.value)}
                placeholder="Type spider wash cup"
              />
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
          </SimpleGrid>

          <Divider my={2} mb={6}/>

          <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">Technical specifications</Text>
          {/* DISEGNO TECNICO O STILIZZATO DELLA GUAINA */}
          <Box mb={4} display="flex" justifyContent="center">
            <Image
              src={"/liner.png"}
              alt="Technical schema"
              maxH="220px"
              objectFit="contain"
              borderRadius="md"
              borderWidth="1px"
              p={2}
              bg="white"
              _dark={{ bg: "gray.800", borderColor: "gray.600" }}
            />
          </Box>
          <SimpleGrid columns={{ base:1, md:2 }} gap={4}>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Liner Length (mm)</FormLabel>
                <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    A
                  </InputLeftAddon>
                  <Input type="number" value={newProduct.liner_length ?? ""} onChange={(e)=>handleNumberChange("liner_length", e.target.value)} />
                </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Hoodcup diameter (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    B
                  </InputLeftAddon>
                <Input type="number" value={newProduct.hoodcup_diameter ?? ""} onChange={(e)=>handleNumberChange("hoodcup_diameter", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Orifice diameter (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    C
                  </InputLeftAddon>
                <Input type="number" value={newProduct.orifice_diameter ?? ""} onChange={(e)=>handleNumberChange("orifice_diameter", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Barrel diameter (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    D
                  </InputLeftAddon>
                <Input type="number" value={newProduct.barrel_diameter ?? ""} onChange={(e)=>handleNumberChange("barrel_diameter", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Return to lockring (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    E
                  </InputLeftAddon>
                <Input type="number" value={newProduct.return_to_lockring ?? ""} onChange={(e)=>handleNumberChange("return_to_lockring", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Lockring diameter (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    F
                  </InputLeftAddon>
                <Input type="number" value={newProduct.lockring_diameter ?? ""} onChange={(e)=>handleNumberChange("lockring_diameter", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Milk tube ID (mm)</FormLabel>
              <InputGroup size="md">
                  <InputLeftAddon
                    w="12"
                    justifyContent="center"
                    fontSize="sm"
                    color="inherit"
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    G
                  </InputLeftAddon>
                <Input type="number" value={newProduct.milk_tube_id ?? ""} onChange={(e)=>handleNumberChange("milk_tube_id", e.target.value)} />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">MP depth (mm)</FormLabel>
              <Input type="number" value={newProduct.mp_depth_mm ?? ""} onChange={(e)=>handleNumberChange("mp_depth_mm", e.target.value)} />
            </FormControl>    

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Shell orifice</FormLabel>
              <Input type="number" value={newProduct.shell_orifice ?? ""} onChange={(e)=>handleNumberChange("shell_orifice", e.target.value)} />
            </FormControl> 

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Shell length</FormLabel>
              <Input type="number" value={newProduct.shell_length ?? ""} onChange={(e)=>handleNumberChange("shell_length", e.target.value)} />
            </FormControl> 

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">shell_external_diameter</FormLabel>
              <Input type="number" value={newProduct.shell_external_diameter ?? ""} onChange={(e)=>handleNumberChange("shell_external_diameter", e.target.value)} />
            </FormControl>                     
            
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600">Overall length (mm)</FormLabel>
              <Input type="number" value={newProduct.overall_length ?? ""} onChange={(e)=>handleNumberChange("overall_length", e.target.value)} />
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
