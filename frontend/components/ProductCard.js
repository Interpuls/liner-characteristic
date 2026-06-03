// components/ProductCard.js
import {
  Card,
  CardBody,
  Heading,
  Tag,
  TagLabel,
  IconButton,
  Button,
  HStack,
  Box,
  Tooltip,
  Stack,
  Text,
  VStack,
  Icon,
} from "@chakra-ui/react";
import { EditIcon, ChevronRightIcon, ViewIcon, LockIcon, CalendarIcon } from "@chakra-ui/icons";

const BARREL_SHAPE_ICON = {
  round: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  triangular: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <polygon points="12 4 20 18 4 18" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
  squared: (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </Icon>
  ),
};
const BARREL_SHAPE_LABEL = { round: "Round", triangular: "Triangular", squared: "Squared" };

/**
 * ProductCard
 * Evidenzia:
 *  - only_admin === false  -> "Public" (occhio) + bordo verde
 *  - only_admin === true   -> "Admins only" (lucchetto) + bordo grigio
 * Mostra brand, compound e manufactured_at (formattata).
 */
export default function ProductCard({ p, onEdit, onDetail }) {
  const title = p.model || p.name || "Product";

  const isPublic = p?.only_admin === false; // visibile a tutti gli users
  const borderColor = isPublic ? "green.400" : "gray.200";
  const accentColor = isPublic ? "green.400" : "gray.300";

  // brand / compound / barrel shape
  const brand = p?.brand || null;
  const compound = p?.compound || null;
  const shapeKey = (p?.barrel_shape || "").toLowerCase();
  const ShapeIcon = BARREL_SHAPE_ICON[shapeKey] || null;
  const shapeLabel = BARREL_SHAPE_LABEL[shapeKey] || null;

  // manufactured_at -> prova a formattare ISO, fallback stringa originale
  let manufacturedStr = null;
  if (p?.manufactured_at) {
    const d = new Date(p.manufactured_at);
    manufacturedStr = isNaN(d.getTime())
      ? String(p.manufactured_at)
      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  return (
    <Card
      variant="outline"
      position="relative"
      borderColor={borderColor}
      borderWidth={isPublic ? "2px" : "1px"}
      _hover={{ shadow: "md", translateY: "-1px", transition: "all 0.15s ease-out" }}
    >
      {/* Accent bar sinistra */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        width="3px"
        bg={accentColor}
        borderTopLeftRadius="md"
        borderBottomLeftRadius="md"
      />

      {/* Pill visibilità in alto a sinistra */}
      <Tooltip
        label={isPublic ? "Visibile a tutti gli utenti" : "Visibile solo agli admin"}
        openDelay={300}
        placement="top-start"
      >
        <HStack
          spacing={1}
          position="absolute"
          top={2}
          left={3}
          px={2}
          py={1}
          bg={isPublic ? "green.50" : "gray.50"}
          border="1px solid"
          borderColor={isPublic ? "green.200" : "gray.200"}
          color={isPublic ? "green.700" : "gray.700"}
          rounded="full"
          fontSize="xs"
        >
          {isPublic ? <ViewIcon boxSize={3.5} /> : <LockIcon boxSize={3.5} />}
          <Text fontWeight="semibold">{isPublic ? "Public" : "Admins only"}</Text>
        </HStack>
      </Tooltip>

      {/* Pulsante Edit in alto a destra */}
      <IconButton
        aria-label="Edit product"
        icon={<EditIcon />}
        size="sm"
        variant="ghost"
        position="absolute"
        top={1}
        right={1}
        onClick={() => onEdit?.(p)}
      />

      <CardBody pt={8} pb={4}>
        <VStack align="start" spacing={3}>
          {/* Titolo */}
          <Heading size="md" lineHeight={1.2} mt={2}>
            {title}
          </Heading>

          {/* Metadati principali: brand, compound, shape */}
          <Stack
            direction={{ base: "column", sm: "row" }}
            spacing={{ base: 2, sm: 6 }}
            flexWrap="wrap"
            w="full"
          >
            {brand && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>Brand:</Text>
                <Tag size="sm" variant="subtle" colorScheme="blue">
                  <TagLabel>{brand}</TagLabel>
                </Tag>
              </Box>
            )}
            {compound && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>Compound:</Text>
                <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={0}>{compound}</Text>
              </Box>
            )}
            {ShapeIcon && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>Shape:</Text>
                <Tooltip label={shapeLabel} hasArrow placement="top" openDelay={300}>
                  <Box as="span" display="inline-flex" alignItems="center">
                    <ShapeIcon boxSize={4} color="gray.700" />
                  </Box>
                </Tooltip>
              </Box>
            )}
          </Stack>

          {/* CTA */}
          <HStack justify="space-between" w="full" pt={1}>
            <Box>
              <Text fontSize="xs" color="gray.400" mb={0}>Manufactured:</Text>
              <Text fontSize="xs" color="gray.500" mb={0}>{manufacturedStr}</Text>
            </Box>
            <Button
              colorScheme="gray"
              size="sm"
              onClick={() => onDetail?.(p)}
              rightIcon={<ChevronRightIcon />}
            >
              Detail
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
}
