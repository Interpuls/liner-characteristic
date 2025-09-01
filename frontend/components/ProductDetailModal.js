import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, SimpleGrid, FormControl, FormLabel, Input,
  Text, Divider, HStack, Button, AlertDialog, AlertDialogOverlay,
  AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useRef, useState, useEffect } from "react";

export default function ProductDetailModal({ isOpen, onClose, product, onEdit, onDelete }) {
  const cancelRef = useRef();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState(null);
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

  const [deleting, setDeleting] = useState(false);

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

  if (!product) return null;

  const F = ({ label, value }) => (
    <FormControl>
      <FormLabel fontSize="sm" color="gray.600">{label}</FormLabel>
      <Input value={value ?? ""} isReadOnly />
    </FormControl>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Product details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
              Product details
            </Text>
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <F label="Brand" value={product.brand} />
              <F label="Model" value={product.model || product.name} />
            </SimpleGrid>

            <Divider my={2} />

            <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
              Technical specifications
            </Text>
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <F label="MP depth (mm)" value={product.mp_depth_mm} />
              <F label="Orifice diameter (mm)" value={product.orifice_diameter} />
              <F label="Hoodcup diameter (mm)" value={product.hoodcup_diameter} />
              <F label="Return to lockring (mm)" value={product.return_to_lockring} />
              <F label="Lockring diameter (mm)" value={product.lockring_diameter} />
              <F label="Overall length (mm)" value={product.overall_length} />
              <F label="Milk tube ID (mm)" value={product.milk_tube_id} />
              <F label="Barrel wall thickness (mm)" value={product.barrell_wall_thickness} />
              <F label="Barrel conicity" value={product.barrell_conicity} />
              <F label="Hardness" value={product.hardness} />
            </SimpleGrid>

            <Divider my={4} />

            <HStack justify="flex-end" spacing={3}>
              <Button
                leftIcon={<DeleteIcon />}
                colorScheme="red"
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button
                leftIcon={<EditIcon />}
                colorScheme="blue"
                onClick={() => onEdit?.(product)}
              >
                Edit product
              </Button>

            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Alert conferma delete */}
      <AlertDialog
        isOpen={confirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete product
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                onClick={() => { void handleDelete(); }} 
                isLoading={deleting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
