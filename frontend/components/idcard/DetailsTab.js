import { Box, Divider, HStack, Tag, TagLabel, Table, Thead, Tbody, Tr, Th, Td, Text } from "@chakra-ui/react";

export default function DetailsTab({ product, onOpenImage, unitSystem = "metric" }) {
  const isImperial = unitSystem === "imperial";
  const unitLabel = isImperial ? "in" : "mm";
  const formatLen = (value) => {
    if (value == null || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return `${value} ${unitLabel}`;
    const converted = isImperial ? num / 25.4 : num;
    const rounded = isImperial ? Number(converted.toFixed(3)) : converted;
    return `${rounded} ${unitLabel}`;
  };

  return (
    <>
      {/* Product image (only in Details) */}
      <Box w="100%" display="flex" justifyContent="center" mb={4} mt={4}>
        <Box
          as="img"
          src="/guaina.png"
          alt="Liner"
          maxH="180px"
          objectFit="contain"
          cursor="zoom-in"
          onClick={() => onOpenImage?.("/guaina.png")}
          tabIndex={0}
          onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { onOpenImage?.("/guaina.png"); e.preventDefault(); } }}
        />
      </Box>

      {/* Legend table (liner dimensions) */}
      <Box overflowX="auto" w="100%" borderWidth="1px" borderRadius="md" bg="white">
        <Table size="sm" variant="striped" colorScheme="gray">
          <Thead>
            <Tr bg="blue.400">
              <Th colSpan={2} color="white">Liner dimension</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(() => {
              const dims = [
                { addon: 'A', label: 'Liner length', value: product?.liner_length },
                { addon: 'B', label: `Hoodcup diameter (${unitLabel})`, value: product?.hoodcup_diameter },
                { addon: 'C', label: `Orifice diameter (${unitLabel})`, value: product?.orifice_diameter },
                { addon: 'D', label: 'Barrel diameter at 75mm', value: product?.barrel_diameter },
                { addon: 'E', label: `Return to lockring (${unitLabel})`, value: product?.return_to_lockring },
                { addon: 'F', label: `Lockring diameter (${unitLabel})`, value: product?.lockring_diameter },
                { addon: 'G', label: `Milk tube ID (${unitLabel})`, value: product?.milk_tube_id },
              ];
              return dims.map((d) => (
                <Tr key={d.addon}>
                  <Td w="60%">
                    <HStack spacing={2}>
                      <Tag size="sm" colorScheme="blue" borderRadius="full"><TagLabel>{d.addon}</TagLabel></Tag>
                      <Text>{d.label}</Text>
                    </HStack>
                  </Td>
                  <Td>{formatLen(d.value)}</Td>
                </Tr>
              ));
            })()}
          </Tbody>
        </Table>
      </Box>

      <Divider my={4} mt={8} borderColor="gray.200" />

      {/* Collector image */}
      <Box w="100%" display="flex" justifyContent="center" mb={4} mt={6}>
        <Box
          as="img"
          src="/cannello.png"
          alt="Collector"
          maxH="180px"
          objectFit="contain"
          cursor="zoom-in"
          onClick={() => onOpenImage?.("/cannello.png")}
          tabIndex={0}
          onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { onOpenImage?.("/collettore.png"); e.preventDefault(); } }}
        />
      </Box>

      {/* Legend table (shell dimensions) */}
      <Box overflowX="auto" w="100%" borderWidth="1px" borderRadius="md" bg="white">
        <Table size="sm" variant="striped" colorScheme="gray">
          <Thead>
            <Tr bg="blue.400">
              <Th colSpan={2} color="white">Shell dimension</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(() => {
              const dims = [
                { addon: 'H', label: `Shell lockring diameter (${unitLabel})`, value: product?.lockring_diameter },
                { addon: 'I', label: `Shell length (${unitLabel})`, value: product?.shell_length },
                { addon: 'L', label: `Shell external diameter (${unitLabel})`, value: product?.shell_external_diameter },
              ];
              return dims.map((d) => (
                <Tr key={d.addon}>
                  <Td w="60%">
                    <HStack spacing={2}>
                      <Tag size="sm" colorScheme="blue" borderRadius="full"><TagLabel>{d.addon}</TagLabel></Tag>
                      <Text>{d.label}</Text>
                    </HStack>
                  </Td>
                  <Td>{formatLen(d.value)}</Td>
                </Tr>
              ));
            })()}
          </Tbody>
        </Table>
      </Box>
    </>
  );
}
