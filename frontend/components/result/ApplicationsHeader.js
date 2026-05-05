import { HStack, Heading, Tag, TagLabel, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Button, Tooltip, Text } from "@chakra-ui/react";
import { ArrowUpDownIcon } from "@chakra-ui/icons";
import { KPI_ORDER, formatKpiLabel } from "../../lib/kpi";

export default function ApplicationsHeader({ total = 0, sortKpi, sortDir = 'desc', sortingBusy = false, onSelectSortKpi, onToggleDir }) {
  return (
    <HStack justify="space-between" align="center">
      <Heading size="lg" color="#12305f">Liners</Heading>
      <HStack gap={2}>
        <Menu>
          <Tooltip label={sortKpi ? `Sorting by ${formatKpiLabel(sortKpi)} (${sortDir})` : "Sort by KPI"} hasArrow>
            <MenuButton
              as={Button}
              size="sm"
              leftIcon={<ArrowUpDownIcon />}
              aria-label="Sort"
              variant="outline"
              isLoading={sortingBusy}
              px={2}
              borderColor={sortKpi ? "blue.500" : "gray.200"}
              color={sortKpi ? "blue.600" : "inherit"}
              _hover={{
                borderColor: sortKpi ? "blue.500" : "gray.300",
              }}
            >
              {sortKpi ? (
                <Text fontSize="xs" maxW={{ base: "120px", md: "170px" }} noOfLines={1}>
                  {formatKpiLabel(sortKpi)}
                </Text>
              ) : null}
            </MenuButton>
          </Tooltip>
          <MenuList>
            <MenuItem onClick={() => onSelectSortKpi && onSelectSortKpi(null)}>Clear sort</MenuItem>
            <MenuItem onClick={() => onToggleDir && onToggleDir()}>Direction: {sortDir === 'asc' ? 'Ascending' : 'Descending'}</MenuItem>
            <MenuDivider />
            {KPI_ORDER.map(code => (
              <MenuItem key={code} onClick={() => onSelectSortKpi && onSelectSortKpi(code)}>{formatKpiLabel(code)}</MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Tag size="sm" variant="subtle"><TagLabel>{total} results</TagLabel></Tag>
      </HStack>
    </HStack>
  );
}
