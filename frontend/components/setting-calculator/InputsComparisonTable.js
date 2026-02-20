import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";

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
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
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

  if (isMobile) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <HStack align="start" justify="space-between" mb={4} spacing={3}>
          <VStack align="start" spacing={0}>
            <Heading size="sm">{leftTitle}</Heading>
            {leftProduct?.subtitle ? <Text fontSize="xs" color="gray.600">{leftProduct.subtitle}</Text> : null}
          </VStack>
          <VStack align="end" spacing={0}>
            <Heading size="sm" textAlign="right">{rightTitle}</Heading>
            {rightProduct?.subtitle ? <Text fontSize="xs" color="gray.600" textAlign="right">{rightProduct.subtitle}</Text> : null}
          </VStack>
        </HStack>

        <Stack spacing={4}>
          {fields.map((field) => (
            <Box key={field.key} borderWidth="1px" borderRadius="md" p={3}>
              <Text fontSize="sm" fontWeight="semibold">
                {field.label} ({field.unit})
              </Text>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3} mt={2}>
                <Box>
                  <FormLabel mb={1} fontSize="xs" color="gray.600">
                    {leftTitle}
                  </FormLabel>
                  <NumericInput
                    value={leftValues[field.key]}
                    onChange={(next) => onChangeLeft(field.key, next)}
                    onBlur={() => onBlurLeft?.(field.key)}
                    field={field}
                    error={mergedLeftErrors?.[field.key]}
                    size="sm"
                  />
                </Box>
                <Box>
                  <FormLabel mb={1} fontSize="xs" color="gray.600">
                    {rightTitle}
                  </FormLabel>
                  <NumericInput
                    value={rightValues[field.key]}
                    onChange={(next) => onChangeRight(field.key, next)}
                    onBlur={() => onBlurRight?.(field.key)}
                    field={field}
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
      <Grid templateColumns="1.1fr 1fr 1fr" gapX={4} gapY={3} alignItems="start">
        <Box />
        <VStack align="start" spacing={0}>
          <Heading size="sm">{leftTitle}</Heading>
          {leftProduct?.subtitle ? <Text fontSize="xs" color="gray.600">{leftProduct.subtitle}</Text> : null}
        </VStack>
        <VStack align="start" spacing={0}>
          <Heading size="sm">{rightTitle}</Heading>
          {rightProduct?.subtitle ? <Text fontSize="xs" color="gray.600">{rightProduct.subtitle}</Text> : null}
        </VStack>

        {fields.map((field) => (
          <Box key={field.key} display="contents">
            <Box pt={2}>
              <Text fontSize="sm" fontWeight="semibold">
                {field.label}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {field.unit}
              </Text>
            </Box>
            <NumericInput
              value={leftValues[field.key]}
              onChange={(next) => onChangeLeft(field.key, next)}
              onBlur={() => onBlurLeft?.(field.key)}
              field={field}
              error={mergedLeftErrors?.[field.key]}
            />
            <NumericInput
              value={rightValues[field.key]}
              onChange={(next) => onChangeRight(field.key, next)}
              onBlur={() => onBlurRight?.(field.key)}
              field={field}
              error={mergedRightErrors?.[field.key]}
            />
          </Box>
        ))}
      </Grid>
    </Box>
  );
}
