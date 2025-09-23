import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, SimpleGrid, FormControl, FormLabel,
  Text, Divider, HStack, Button, AlertDialog, AlertDialogOverlay,
  AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure, Box, Image, Input, InputGroup, InputLeftAddon
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useRef, useState, useEffect } from "react";

export default function ProductDetailModal({ isOpen, onClose, product, onEdit, onDelete }) {
  const cancelRef = useRef();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { onClose: onConfirmClose } = useDisclosure(); // solo per firma compatibile
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) setConfirmOpen(false);
  }, [isOpen]);

  const handleDelete = async () => {
    if (deleting || !product?.id) return;
    setDeleting(true);
    try {
      await onDelete(product.id);
      setConfirmOpen(false);
      onConfirmClose?.();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!product) return null;

  const F = ({ label, value, addon }) => {
    const display =
      value !== null && value !== undefined && value !== "" ? value : "-";
  
    return (
      <FormControl>
        <FormLabel fontSize="sm" color="gray.600">{label}</FormLabel>
        {addon ? (
          <InputGroup size="sm">
            <InputLeftAddon>{addon}</InputLeftAddon>
            <Input
              value={display}
              isReadOnly
              pointerEvents="none"     // evita focus/caret
              tabIndex={-1}            // evita tab stop
              variant="outline"
              bg="gray.50"
              _dark={{ bg: "gray.700", borderColor: "gray.600" }}
            />
          </InputGroup>
        ) : (
          <Box
            borderWidth="1px"
            borderRadius="md"
            px={3}
            py={2}
            bg="gray.50"
            _dark={{ bg: "gray.700", borderColor: "gray.600" }}
          >
            <Text fontWeight="medium">{display}</Text>
          </Box>
        )}
      </FormControl>
    );
  };
  
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Product details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.400" mb={2} fontWeight="medium">
              Product details
            </Text>
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <F label="Brand" value={product.brand} />
              <F label="Model" value={product.model || product.name} />
              <F label="Compound" value={product.compound} />
              <F label="Manufactured at" value={product.manufactured_at || "-"} />
              <F label="Visible to users" value={product.only_admin ? "No" : "Yes"} />
              <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
                <FormLabel fontSize="sm" color="gray.600">Notes</FormLabel>
                <Box p={3} borderWidth="1px" rounded="md" bg="gray.50" whiteSpace="pre-wrap">
                  {product.notes || "-"}
                </Box>
              </FormControl>
            </SimpleGrid>

            <Divider my={2} />

            <Text fontSize="sm" color="gray.400" mb={2} fontWeight="medium">
              Technical specifications
            </Text>
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
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <F label="MP depth (mm)" value={product.mp_depth_mm} addon="A"/>
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
                onClick={handleDelete}
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
