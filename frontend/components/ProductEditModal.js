import { useEffect, useState, useRef } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button,
  useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
} from "@chakra-ui/react";
import ProductFields from "./ProductFields";

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
        shell_type: product.shell_type ?? null,
        wash_cup: product.wash_cup ?? null,
        spider_wash_cup: product.spider_wash_cup ?? null,
        manufactured_at: product.manufactured_at || "",
        only_admin: !!product.only_admin,
        notes: product.notes || "",
        robot_liner: !!product.robot_liner,
        barrel_shape: product.barrel_shape || "",
        reference_areas: product.reference_areas ?? null,

        mp_depth_mm: product.mp_depth_mm ?? null,
        orifice_diameter: product.orifice_diameter ?? null,
        barrel_diameter: product.barrel_diameter ?? null,
        shell_orifice: product.shell_orifice ?? null,
        shell_length: product.shell_length ?? null,
        shell_length: product.shell_length ?? null, 
        shell_external_diameter: product.shell_external_diameter ?? null,
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
  const handleNumber = (field, value) => {
    const parsed = value === "" ? null : parseFloat(String(value).replace(",", "."));
    setForm((prev) => ({ ...prev, [field]: Number.isNaN(parsed) ? null : parsed }));
  };
  const handleVisibleChange = (checked) => setForm(prev => ({ ...prev, only_admin: !checked }));

  const handleSave = async () => {
    if (saving || !product?.id || !form) return;
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
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit product</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <ProductFields
              values={form}
              meta={meta}
              onChange={handleChange}
              onNumberChange={handleNumber}
              onVisibleChange={handleVisibleChange}
              techImageUrl={product?.tech_image_url}
            />
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
          <AlertDialogContent marginInline={2}>
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

