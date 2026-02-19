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

function NumericInput({ value, onChange, field, error }) {
  return (
    <FormControl isInvalid={!!error}>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={field.step || "0.1"}
        min={field.min ?? 0}
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
}

function SideColumn({ title, subtitle, values, onFieldChange, errors }) {
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
  onChangeLeft,
  onChangeRight,
}) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (isMobile) {
    return (
      <Stack spacing={4}>
        <SideColumn
          title={leftProduct?.label || "Left Product"}
          subtitle={leftProduct?.subtitle}
          values={leftValues}
          errors={leftErrors}
          onFieldChange={onChangeLeft}
        />
        <SideColumn
          title={rightProduct?.label || "Right Product"}
          subtitle={rightProduct?.subtitle}
          values={rightValues}
          errors={rightErrors}
          onFieldChange={onChangeRight}
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
          errors={leftErrors}
          onFieldChange={onChangeLeft}
        />
      </GridItem>
      <GridItem>
        <SideColumn
          title={rightProduct?.label || "Right Product"}
          subtitle={rightProduct?.subtitle}
          values={rightValues}
          errors={rightErrors}
          onFieldChange={onChangeRight}
        />
      </GridItem>
    </Grid>
  );
}
