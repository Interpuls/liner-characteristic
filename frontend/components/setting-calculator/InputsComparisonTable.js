import {
  Box,
  FormControl,
  FormErrorMessage,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
  Tooltip,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";

function NumericInput({ value, onChange, onBlur, field, error, size = "md" }) {
  return (
    <FormControl isInvalid={!!error}>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        step={field.step || "0.1"}
        min={field.min ?? 0}
        size={size}
        bg={field.inputBg || "white"}
        borderColor={field.inputBorderColor || "gray.200"}
        _hover={{ borderColor: field.inputBorderColor || "gray.300" }}
        _focusVisible={{
          borderColor: field.inputFocusBorderColor || "blue.400",
          boxShadow: `0 0 0 1px ${field.inputFocusBorderColor || "#63b3ed"}`,
        }}
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
}

function getFieldHelpText(field) {
  const map = {
    milkingVacuumMaxKpa: "Maximum vacuum level used in the milking cycle.",
    pfVacuumKpa: "Vacuum level applied during peak flow.",
    omVacuumKpa: "Vacuum level applied during overmilking.",
    omDurationSec: "Overmilking duration in seconds.",
    frequencyBpm: "Pulsation frequency in beats per minute.",
    ratioPct: "Pulsation ratio as ON percentage of the full cycle.",
    phaseAMs: "Duration of phase A in milliseconds.",
    phaseCMs: "Duration of phase C in milliseconds.",
  };
  return map[field.key] || `${field.label} parameter.`;
}

export default function InputsComparisonTable({
  fields,
  leftProduct,
  rightProduct,
  leftValues,
  rightValues,
  leftErrors,
  rightErrors,
  leftBackendErrors,
  rightBackendErrors,
  onChangeLeft,
  onChangeRight,
  onBlurLeft,
  onBlurRight,
}) {
  const leftTitle = leftProduct?.label || "Left Product";
  const rightTitle = rightProduct?.label || "Right Product";

  const mergedLeftErrors = Object.fromEntries(
    fields.map((f) => [
      f.key,
      leftBackendErrors?.[f.key] || leftErrors?.[f.key] || undefined,
    ])
  );
  const mergedRightErrors = Object.fromEntries(
    fields.map((f) => [
      f.key,
      rightBackendErrors?.[f.key] || rightErrors?.[f.key] || undefined,
    ])
  );

  const isMobile = useBreakpointValue({ base: true, md: false });
  const leftMeta = [leftProduct?.brand, leftProduct?.sizeLabel && leftProduct.sizeLabel !== "-" ? leftProduct.sizeLabel : null]
    .filter(Boolean)
    .join(" • ");
  const rightMeta = [rightProduct?.brand, rightProduct?.sizeLabel && rightProduct.sizeLabel !== "-" ? rightProduct.sizeLabel : null]
    .filter(Boolean)
    .join(" • ");

  if (isMobile) {
    return (
      <Box>
        <HStack align="start" justify="space-between" mb={4} spacing={3}>
          <Box flex="1" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={2}>
            <Heading size="sm">{leftTitle}</Heading>
            {leftMeta ? <Text fontSize="xs" color="gray.600">{leftMeta}</Text> : null}
          </Box>
          <Box flex="1" borderWidth="1px" borderColor="blue.200" borderRadius="md" bg="blue.50" p={2}>
            <Heading size="sm" textAlign="right">{rightTitle}</Heading>
            {rightMeta ? <Text fontSize="xs" color="blue.700" textAlign="right">{rightMeta}</Text> : null}
          </Box>
        </HStack>

        <Stack spacing={4}>
          {fields.map((field) => (
            <Box key={field.key} borderWidth="1px" borderRadius="md" p={3}>
              <HStack justify="space-between" align="center">
                <HStack spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold">
                    {field.label}
                  </Text>
                  <Tooltip label={getFieldHelpText(field)} hasArrow placement="top">
                    <IconButton
                      aria-label={`Info about ${field.label}`}
                      icon={<InfoOutlineIcon boxSize={3.5} />}
                      size="xs"
                      variant="ghost"
                      minW="22px"
                      h="22px"
                      borderRadius="full"
                      color="blue.600"
                      _hover={{ bg: "transparent", color: "blue.700" }}
                      _active={{ bg: "transparent" }}
                    />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color="gray.600" mt="-1px">
                  {field.unit}
                </Text>
              </HStack>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3} mt={2}>
                <Box>
                  <NumericInput
                    value={leftValues[field.key]}
                    onChange={(next) => onChangeLeft(field.key, next)}
                    onBlur={() => onBlurLeft?.(field.key)}
                    field={{
                      ...field,
                      inputBg: "white",
                      inputBorderColor: "gray.200",
                      inputFocusBorderColor: "#63b3ed",
                    }}
                    error={mergedLeftErrors?.[field.key]}
                    size="sm"
                  />
                </Box>
                <Box>
                  <NumericInput
                    value={rightValues[field.key]}
                    onChange={(next) => onChangeRight(field.key, next)}
                    onBlur={() => onBlurRight?.(field.key)}
                    field={{
                      ...field,
                      inputBg: "blue.50",
                      inputBorderColor: "blue.200",
                      inputFocusBorderColor: "#3182ce",
                    }}
                    error={mergedRightErrors?.[field.key]}
                    size="sm"
                  />
                </Box>
              </Grid>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Grid templateColumns="1.1fr 1fr 1fr" gapX={6} gapY={6} alignItems="start">
        <Box />
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={2} mr={{ base: 0, md: 2 }}>
          <Heading size="sm">{leftTitle}</Heading>
          {leftMeta ? <Text fontSize="xs" color="gray.600">{leftMeta}</Text> : null}
        </Box>
        <Box borderWidth="1px" borderColor="blue.200" borderRadius="md" bg="blue.50" p={2} ml={{ base: 0, md: 2 }}>
          <Heading size="sm">{rightTitle}</Heading>
          {rightMeta ? <Text fontSize="xs" color="blue.700">{rightMeta}</Text> : null}
        </Box>

        {fields.map((field, idx) => (
          <Box key={field.key} display="contents">
            <Box pt={idx === 0 ? 6 : 2}>
              <HStack spacing={1} align="center">
                <Text fontSize="sm" fontWeight="semibold">
                  {field.label}
                </Text>
                <Tooltip label={getFieldHelpText(field)} hasArrow placement="top">
                  <IconButton
                    aria-label={`Info about ${field.label}`}
                    icon={<InfoOutlineIcon boxSize={3.5} />}
                    size="xs"
                    variant="ghost"
                    minW="22px"
                    h="22px"
                    borderRadius="full"
                    color="blue.600"
                    _hover={{ bg: "transparent", color: "blue.700" }}
                    _active={{ bg: "transparent" }}
                  />
                </Tooltip>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                {field.unit}
              </Text>
            </Box>
            <Box pr={2} pt={idx === 0 ? 4 : 0}>
              <NumericInput
                value={leftValues[field.key]}
                onChange={(next) => onChangeLeft(field.key, next)}
                onBlur={() => onBlurLeft?.(field.key)}
                field={{
                  ...field,
                  inputBg: "white",
                  inputBorderColor: "gray.200",
                  inputFocusBorderColor: "#63b3ed",
                }}
                error={mergedLeftErrors?.[field.key]}
              />
            </Box>
            <Box pl={2} pt={idx === 0 ? 4 : 0}>
              <NumericInput
                value={rightValues[field.key]}
                onChange={(next) => onChangeRight(field.key, next)}
                onBlur={() => onBlurRight?.(field.key)}
                field={{
                  ...field,
                  inputBg: "blue.50",
                  inputBorderColor: "blue.200",
                  inputFocusBorderColor: "#3182ce",
                }}
                error={mergedRightErrors?.[field.key]}
              />
            </Box>
          </Box>
        ))}
      </Grid>
    </Box>
  );
}
