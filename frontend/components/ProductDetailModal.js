// Modale di dettaglio del prodotto che si apre dalla pagina prodotti per visualizzare i dettagli specifici di un prodotto

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
  const { onClose: onConfirmClose } = useDisclosure();
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

  const F = ({ label, value, addon, font }) => {
    const display =
      value !== null && value !== undefined && value !== "" ? value : "-";

    return (
      <FormControl mb={2}>
        <FormLabel fontSize="sm" color="gray.600">{label}</FormLabel>
        {addon ? (
          <InputGroup size="md">
            <InputLeftAddon
              w="12"
              justifyContent="center"
              fontSize="sm"
              color="inherit"
              _dark={{ bg: "gray.700", borderColor: "gray.600" }}
            >
              {addon}
            </InputLeftAddon>
            <Input
              value={display}
              isReadOnly
              pointerEvents="none"
              tabIndex={-1}
              variant="outline"
              bg="gray.50"
              _dark={{ bg: "gray.700", borderColor: "gray.600" }}
            />
          </InputGroup>
        ) : (
          <InputGroup size="md">
            <Input
              value={display}
              fontWeight={font}
              isReadOnly
              pointerEvents="none"
              tabIndex={-1}
              variant="outline"
              bg="gray.50"
              _dark={{ bg: "gray.700", borderColor: "gray.600" }}
            />
          </InputGroup>
        )}
      </FormControl>
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Product details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.400" mb={2} fontWeight="medium">
              Product details
            </Text>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={6}>
              <F label="Brand" value={product.brand} font="medium" />
              <F label="Model" value={product.model || product.name} font="medium" />
              <F label="Compound" value={product.compound} font="medium" />
              <F label="Shell type" value={product.shell_type} />
              <F label="Wash cup" value={product.wash_cup} />
              <F label="Spider wash cup" value={product.spider_wash_cup} />
              <F label="Manufactured at" value={product.manufactured_at || "-"} />
              <FormControl gridColumn={{ base: "span 1", md: "span 2" }}>
                <FormLabel fontSize="sm" color="gray.600">Notes</FormLabel>
                <Box p={3} borderWidth="1px" rounded="md" bg="gray.50" whiteSpace="pre-wrap">
                  {product.notes || "-"}
                </Box>
              </FormControl>
              <F label="Visible to users" value={product.only_admin ? "No" : "Yes"} />
            </SimpleGrid>

            <Divider my={2} />

            {/* SPECIFICHE TECNICHE */}
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

            {/* CAMPI TECNICI DEL PRODOTTO */}
            <SimpleGrid columns={{ base:1, md:2 }} gap={4} mb={6}>
              <F label="Liner length" value={product.liner_length} addon="A" />
              <F label="Hoodcup diameter (mm)" value={product.hoodcup_diameter} addon="B"/>
              <F label="Orifice diameter (mm)" value={product.orifice_diameter} addon="C"/>
              <F label="Barrel diameter at 75mm" value={product.barrel_diameter} addon="D"/>
              <F label="Return to lockring (mm)" value={product.return_to_lockring} addon="E" />
              <F label="Lockring diameter (mm)" value={product.lockring_diameter} addon="F"/>
              <F label="Milk tube ID (mm)" value={product.milk_tube_id} addon="G"/>
              {/* Campi non presenti nel disegno */}
              <F label="MP depth (mm)" value={product.mp_depth_mm} />
              <F label="Shell Orifice" value={product.shell_orifice} />
              <F label="Shell Length" value={product.shell_length} />
              <F label="Shell external diameter" value={product.shell_external_diameter} />
              <F label="Orifice diameter (mm)" value={product.orifice_diameter} />
              <F label="Overall length (mm)" value={product.overall_length} />
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

      <AlertDialog
        isOpen={confirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent marginInline={2}>
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
