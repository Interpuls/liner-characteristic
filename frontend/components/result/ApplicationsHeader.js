import { HStack, Heading, Tag, TagLabel, Menu, MenuButton, MenuList, MenuItem, MenuDivider, IconButton, Tooltip } from "@chakra-ui/react";
import { ArrowUpDownIcon } from "@chakra-ui/icons";

const KPI_ORDER = [
  'CLOSURE','FITTING','CONGESTION_RISK','HYPERKERATOSIS_RISK','SPEED','RESPRAY','FLUYDODINAMIC','SLIPPAGE','RINGING_RISK'
];

export default function ApplicationsHeader({ total = 0, sortKpi, sortDir = 'desc', sortingBusy = false, onSelectSortKpi, onToggleDir }) {
  return (
    <HStack justify="space-between" align="center">
      <Heading size="lg" color="#12305f">Liners</Heading>
      <HStack gap={2}>
        <Menu>
          <Tooltip label={sortKpi ? `Sorting by ${sortKpi} (${sortDir})` : "Sort by KPI"} hasArrow>
            <MenuButton as={IconButton} size="sm" icon={<ArrowUpDownIcon />} aria-label="Sort" variant="outline" isLoading={sortingBusy} />
          </Tooltip>
          <MenuList>
            <MenuItem onClick={() => onSelectSortKpi && onSelectSortKpi(null)}>Clear sort</MenuItem>
            <MenuItem onClick={() => onToggleDir && onToggleDir()}>Direction: {sortDir === 'asc' ? 'Ascending' : 'Descending'}</MenuItem>
            <MenuDivider />
            {KPI_ORDER.map(code => (
              <MenuItem key={code} onClick={() => onSelectSortKpi && onSelectSortKpi(code)}>{code}</MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Tag size="sm" variant="subtle"><TagLabel>{total} results</TagLabel></Tag>
      </HStack>
    </HStack>
  );
}
