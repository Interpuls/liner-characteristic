import { Box, HStack, Tag, TagLabel, Table, Thead, Tbody, Tr, Th, Td, Text } from "@chakra-ui/react";

export default function DetailsTab({ product, onOpenImage }) {
  return (
    <>
      {/* Product image (only in Details) */}
      <Box w="100%" display="flex" justifyContent="center" mb={4}>
        <Box
          as="img"
          src="/liner.png"
          alt="Liner"
          maxH="180px"
          objectFit="contain"
          cursor="zoom-in"
          onClick={onOpenImage}
          tabIndex={0}
          onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { onOpenImage?.(); e.preventDefault(); } }}
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
                { addon: 'B', label: 'Hoodcup diameter (mm)', value: product?.hoodcup_diameter },
                { addon: 'C', label: 'Orifice diameter (mm)', value: product?.orifice_diameter },
                { addon: 'D', label: 'Barrel diameter at 75mm', value: product?.barrel_diameter },
                { addon: 'E', label: 'Return to lockring (mm)', value: product?.return_to_lockring },
                { addon: 'F', label: 'Lockring diameter (mm)', value: product?.lockring_diameter },
                { addon: 'G', label: 'Milk tube ID (mm)', value: product?.milk_tube_id },
              ];
              return dims.map((d) => (
                <Tr key={d.addon}>
                  <Td w="60%">
                    <HStack spacing={2}>
                      <Tag size="sm" colorScheme="blue" borderRadius="full"><TagLabel>{d.addon}</TagLabel></Tag>
                      <Text>{d.label}</Text>
                    </HStack>
                  </Td>
                  <Td>{d.value != null && d.value !== '' ? `${d.value} mm` : '–'}</Td>
                </Tr>
              ));
            })()}
          </Tbody>
        </Table>
      </Box>
    </>
  );
}

