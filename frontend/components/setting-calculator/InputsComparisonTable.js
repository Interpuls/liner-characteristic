import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Stack,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { SETTING_INPUT_FIELDS } from "../../lib/settingCalculator";

function NumericInput({ value, onChange, onBlur, field, error }) {
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
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
}

function SideColumn({ title, subtitle, values, onFieldChange, onFieldBlur, errors }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="sm" mb={1}>{title}</Heading>
      {subtitle ? <Text fontSize="xs" color="gray.600" mb={3}>{subtitle}</Text> : null}
      <Stack spacing={3}>
        {SETTING_INPUT_FIELDS.map((field) => (
          <FormControl key={field.key} isInvalid={!!errors?.[field.key]}>
            <FormLabel fontSize="sm" mb={1}>
              {field.label} ({field.unit})
            </FormLabel>
            <NumericInput
              value={values[field.key]}
              onChange={(next) => onFieldChange(field.key, next)}
              onBlur={() => onFieldBlur?.(field.key)}
              field={field}
              error={errors?.[field.key]}
            />
          </FormControl>
        ))}
      </Stack>
    </Box>
  );
}

export default function InputsComparisonTable({
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
  const mergedLeftErrors = Object.fromEntries(
    SETTING_INPUT_FIELDS.map((f) => [
      f.key,
      leftBackendErrors?.[f.key] || leftErrors?.[f.key] || undefined,
    ])
  );
  const mergedRightErrors = Object.fromEntries(
    SETTING_INPUT_FIELDS.map((f) => [
      f.key,
      rightBackendErrors?.[f.key] || rightErrors?.[f.key] || undefined,
    ])
  );

  const isMobile = useBreakpointValue({ base: true, md: false });

  if (isMobile) {
    return (
      <Stack spacing={4}>
        <SideColumn
          title={leftProduct?.label || "Left Product"}
          subtitle={leftProduct?.subtitle}
          values={leftValues}
          errors={mergedLeftErrors}
          onFieldChange={onChangeLeft}
          onFieldBlur={onBlurLeft}
        />
        <SideColumn
          title={rightProduct?.label || "Right Product"}
          subtitle={rightProduct?.subtitle}
          values={rightValues}
          errors={mergedRightErrors}
          onFieldChange={onChangeRight}
          onFieldBlur={onBlurRight}
        />
      </Stack>
    );
  }

  return (
    <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
      <GridItem>
        <SideColumn
          title={leftProduct?.label || "Left Product"}
          subtitle={leftProduct?.subtitle}
          values={leftValues}
          errors={mergedLeftErrors}
          onFieldChange={onChangeLeft}
          onFieldBlur={onBlurLeft}
        />
      </GridItem>
      <GridItem>
        <SideColumn
          title={rightProduct?.label || "Right Product"}
          subtitle={rightProduct?.subtitle}
          values={rightValues}
          errors={mergedRightErrors}
          onFieldChange={onChangeRight}
          onFieldBlur={onBlurRight}
        />
      </GridItem>
    </Grid>
  );
}
