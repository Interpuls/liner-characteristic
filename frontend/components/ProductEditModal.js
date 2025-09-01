import { useEffect, useState, useRef } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Input, SimpleGrid, Text, Divider,
  useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay
} from "@chakra-ui/react";

/**
 * props:
 * - isOpen, onClose
 * - meta
 * - product: prodotto da editare (id, brand, model, specs...)
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

  const handleNumber = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value === "" ? null : parseFloat(value) }));
  };

  const handleSave = async () => {
    if (saving || !product?.id) return;
    setSaving(true);
    try {
      await onSave(product.id, form);
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

  const disabled = !form.brand || !form.model || saving || deleting;

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
                  onChange={(e)=>setForm(prev=>({...prev, brand: e.target.value}))}
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
                  onChange={(e)=>setForm(prev=>({...prev, model: e.target.value}))}
                  placeholder="Type or choose a model"
                />
                <datalist id="model-options">
                  {(meta?.models || []).map(v => <option key={v} value={v} />)}
                </datalist>
              </FormControl>
            </SimpleGrid>

            <Divider my={2} />

            {/* Technical specs */}
            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">Technical specifications</Text>
            <SimpleGrid columns={{ base:1, md:2 }} gap={4}>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">MP depth (mm)</FormLabel>
                <Input type="number" value={form.mp_depth_mm ?? ""} onChange={(e)=>handleNumber("mp_depth_mm", e.target.value)} />
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
            <Button variant="outline" colorScheme="red" onClick={onConfirmOpen} isDisabled={saving || deleting}>
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
