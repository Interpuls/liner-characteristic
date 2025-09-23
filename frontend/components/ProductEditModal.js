import { useEffect, useState, useRef } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Text, Divider,
  useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, Checkbox, Textarea, Image, Box, InputGroup,
  InputLeftAddon
} from "@chakra-ui/react";

/**
 * props:
 * - isOpen, onClose
 * - meta
 * - product
 * - onSave: async (id, patch) => void
 * - onDelete: async (id) => void
 */
export default function ProductEditModal({ isOpen, onClose, meta, product, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // confirm dialog
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const cancelRef = useRef();

  useEffect(() => {
    if (product) {
      setForm({
        brand: product.brand || "",
        model: product.model || "",
        compound: product.compound || "STD",
        manufactured_at: product.manufactured_at || "",      // date string
        only_admin: !!product.only_admin,
        notes: product.notes || "",

        mp_depth_mm: product.mp_depth_mm ?? null,
        orifice_diameter: product.orifice_diameter ?? null,
        hoodcup_diameter: product.hoodcup_diameter ?? null,
        return_to_lockring: product.return_to_lockring ?? null,
        lockring_diameter: product.lockring_diameter ?? null,
        overall_length: product.overall_length ?? null,
        milk_tube_id: product.milk_tube_id ?? null,
        barrell_wall_thickness: product.barrell_wall_thickness ?? null,
        barrell_conicity: product.barrell_conicity ?? null,
        hardness: product.hardness ?? null,
      });
    }
  }, [product, isOpen]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleCheckbox = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.checked }));
  const handleNumber = (field, value) => {
    const parsed = value === "" ? null : parseFloat(String(value).replace(",", "."));
    setForm((prev) => ({ ...prev, [field]: Number.isNaN(parsed) ? null : parsed }));
  };

  const handleSave = async () => {
    if (saving || !product?.id) return;
    setSaving(true);
    try {
      const patch = {
        ...form,
        manufactured_at: form.manufactured_at || null,
        notes: form.notes?.trim() || null,
        compound: (form.compound || "STD").toUpperCase(),
      };
      await onSave(product.id, patch);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !product?.id) return;
    setDeleting(true);
    try {
      await onDelete(product.id);
      onConfirmClose();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!form) return null;

  const disabled = !form.brand || !form.model || !form.compound || saving || deleting;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit product</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* Product details */}
            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">Product details</Text>
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.600">Brand</FormLabel>
                <Input
                  list="brand-options"
                  value={form.brand}
                  onChange={(e)=>handleChange("brand", e.target.value)}
                  placeholder="Type or choose a brand"
                />
                <datalist id="brand-options">
                  {(meta?.brands || []).map(v => <option key={v} value={v} />)}
                </datalist>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.600">Model</FormLabel>
                <Input
                  list="model-options"
                  value={form.model}
                  onChange={(e)=>handleChange("model", e.target.value)}
                  placeholder="Type or choose a model"
                />
                <datalist id="model-options">
                  {(meta?.models || []).map(v => <option key={v} value={v} />)}
                </datalist>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.600">Compound</FormLabel>
                <Input
                  list="compound-options"
                  value={form.compound}
                  onChange={(e)=>handleChange("compound", e.target.value.toUpperCase())}
                  placeholder="Type or choose a compound"
                />
                <datalist id="compound-options">
                  {(meta?.compounds || []).map(v => <option key={v} value={v} />)}
                </datalist>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Manufactured at</FormLabel>
                <Input
                  type="date"
                  value={form.manufactured_at ?? ""}
                  onChange={(e)=> setForm(p => ({ ...p, manufactured_at: e.target.value || null }))}
                />
              </FormControl>

              <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
                <Checkbox
                  isChecked={!form.only_admin}
                  onChange={(e) =>
                    setForm(prev => ({ ...prev, only_admin: !e.target.checked }))
                  }
                >
                  Visible to users
                </Checkbox>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Setting this as public will hide other variants of the same Brand/Model.
                </Text>
              </FormControl>

              <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
                <FormLabel fontSize="sm" color="gray.600">Notes</FormLabel>
                <Textarea
                  placeholder="Optional notes for testers"
                  value={form.notes}
                  onChange={(e)=>handleChange("notes", e.target.value)}
                  rows={3}
                />
              </FormControl>
            </SimpleGrid>

            <Divider my={2} />

            {/* Technical specs */}
            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">Technical specifications</Text>
            {/* DISEGNO TECNICO O STILIZZATO DELLA GUAINA */}
            <Box mb={4} display="flex" justifyContent="center">
              <Image
                src={product?.tech_image_url || "/liner.png"}
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
                <FormLabel fontSize="sm" color="gray.600">MP depth (mm)</FormLabel>
                <InputGroup>
                  <InputLeftAddon color="red" fontSize="sm">A</InputLeftAddon>
                  <Input type="number" value={form.mp_depth_mm ?? ""} onChange={(e)=>handleNumber("mp_depth_mm", e.target.value)} />
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Orifice diameter (mm)</FormLabel>
                <Input type="number" value={form.orifice_diameter ?? ""} onChange={(e)=>handleNumber("orifice_diameter", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Hoodcup diameter (mm)</FormLabel>
                <Input type="number" value={form.hoodcup_diameter ?? ""} onChange={(e)=>handleNumber("hoodcup_diameter", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Return to lockring (mm)</FormLabel>
                <Input type="number" value={form.return_to_lockring ?? ""} onChange={(e)=>handleNumber("return_to_lockring", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Lockring diameter (mm)</FormLabel>
                <Input type="number" value={form.lockring_diameter ?? ""} onChange={(e)=>handleNumber("lockring_diameter", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Overall length (mm)</FormLabel>
                <Input type="number" value={form.overall_length ?? ""} onChange={(e)=>handleNumber("overall_length", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Milk tube ID (mm)</FormLabel>
                <Input type="number" value={form.milk_tube_id ?? ""} onChange={(e)=>handleNumber("milk_tube_id", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Barrel wall thickness (mm)</FormLabel>
                <Input type="number" value={form.barrell_wall_thickness ?? ""} onChange={(e)=>handleNumber("barrell_wall_thickness", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Barrel conicity</FormLabel>
                <Input type="number" value={form.barrell_conicity ?? ""} onChange={(e)=>handleNumber("barrell_conicity", e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Hardness</FormLabel>
                <Input type="number" value={form.hardness ?? ""} onChange={(e)=>handleNumber("hardness", e.target.value)} />
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter justifyContent="space-between">
            <Button colorScheme="red" onClick={onConfirmOpen} isDisabled={saving || deleting}>
              Delete product
            </Button>
            <div>
              <Button variant="ghost" mr={3} onClick={onClose} isDisabled={saving || deleting}>Cancel</Button>
              <Button colorScheme="blue" onClick={() => { void handleSave(); }} isLoading={saving} isDisabled={disabled}>
                Save
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm delete */}
      <AlertDialog isOpen={isConfirmOpen} leastDestructiveRef={cancelRef} onClose={onConfirmClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete product</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This will permanently delete the product.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onConfirmClose} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={() => { void handleDelete(); }} isLoading={deleting} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
