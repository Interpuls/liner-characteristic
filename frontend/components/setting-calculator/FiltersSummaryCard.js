import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Heading,
  HStack,
  IconButton,
  Spacer,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { ChevronDownIcon, SettingsIcon } from "@chakra-ui/icons";
import { getSettingInputFields } from "../../lib/settingCalculator";

function formatValue(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function FiltersSummaryCard({
  leftInputs,
  rightInputs,
  leftTitle = "Left",
  rightTitle = "Right",
  leftTeatSize = "",
  rightTeatSize = "",
  onBack,
  unitSystem = "metric",
}) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const fields = getSettingInputFields(unitSystem);
    return fields.map((field) => {
      const leftVal = leftInputs?.[field.key];
      const rightVal = rightInputs?.[field.key];
      return {
        key: field.key,
        label: field.label,
        unit: field.unit || "",
        leftVal,
        rightVal,
      };
    });
  }, [leftInputs, rightInputs, unitSystem]);

  return (
    <Card>
      <CardHeader
        py={3}
        cursor={open ? "default" : "pointer"}
        onClick={() => {
          if (!open) setOpen(true);
        }}
      >
        <HStack align="center">
          <SettingsIcon color="blue.500" boxSize={4} />
          <Heading size="sm" color="#12305f">Input parameters</Heading>
          <Spacer />
          <IconButton
            aria-label={open ? "Collapse" : "Expand"}
            icon={<ChevronDownIcon transform={open ? undefined : "rotate(-90deg)"} />}
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          />
        </HStack>
      </CardHeader>

      {open && (
        <CardBody pt={0}>
          {rows.length === 0 ? (
            <Text color="gray.500" fontSize="sm" mt={1}>
              No input parameters available.
            </Text>
          ) : (
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th display={{ base: "none", md: "table-cell" }}>Parameter</Th>
                    <Th textAlign={{ base: "center", md: "left" }}>
                      <VStack align={{ base: "center", md: "start" }} spacing={0}>
                        <Text fontWeight="semibold" fontSize={{ base: "xs", md: "sm" }} textTransform="uppercase" letterSpacing="0.04em">
                          {leftTitle}
                        </Text>
                        {leftTeatSize ? (
                          <Text fontSize="xs" color="gray.500">
                            Teat size: {leftTeatSize}
                          </Text>
                        ) : null}
                      </VStack>
                    </Th>
                    <Th textAlign={{ base: "center", md: "left" }}>
                      <VStack align={{ base: "center", md: "start" }} spacing={0}>
                        <Text fontWeight="semibold" fontSize={{ base: "xs", md: "sm" }} textTransform="uppercase" letterSpacing="0.04em">
                          {rightTitle}
                        </Text>
                        {rightTeatSize ? (
                          <Text fontSize="xs" color="gray.500">
                            Teat size: {rightTeatSize}
                          </Text>
                        ) : null}
                      </VStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => (
                    <>
                      <Tr key={`${row.key}-mobile-label`} display={{ base: "table-row", md: "none" }}>
                        <Td colSpan={2} textAlign="center" py={1.5} borderBottomWidth="0">
                          <Text fontSize="xs" color="gray.500">
                            {row.label}
                            {row.unit ? ` (${row.unit})` : ""}
                          </Text>
                        </Td>
                      </Tr>
                      <Tr key={row.key}>
                        <Td display={{ base: "none", md: "table-cell" }}>
                          {row.label}
                          {row.unit ? ` (${row.unit})` : ""}
                        </Td>
                        <Td textAlign={{ base: "center", md: "left" }}>
                          <Text fontWeight="medium">{formatValue(row.leftVal)}</Text>
                        </Td>
                        <Td textAlign={{ base: "center", md: "left" }}>
                          <Text fontWeight="medium">{formatValue(row.rightVal)}</Text>
                        </Td>
                      </Tr>
                    </>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}

          <HStack justify="flex-end" mt={3}>
            <Button variant="outline" onClick={onBack}>
              Back to Inputs
            </Button>
          </HStack>
        </CardBody>
      )}
    </Card>
  );
}
