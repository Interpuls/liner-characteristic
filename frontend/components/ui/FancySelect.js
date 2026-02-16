import React, { useEffect, useMemo, useState } from "react";
import {
  Menu, MenuButton, MenuList, MenuItem, Button, Box, HStack,
  Input, Text, Icon, Portal
} from "@chakra-ui/react";
import { ChevronDownIcon, CheckIcon, SearchIcon } from "@chakra-ui/icons";

/**
 * options: array<string | {label: string, value: string, menuLabel?: ReactNode}>
 * value: string | "" (controllato)
 * onChange: (val: string) => void
 */
export default function FancySelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Seleziona",
  maxH = "260px",
  w = "full",
  disabled = false,
  menuPlacement = "bottom-start",
  menuZIndex = 1600,
  iconColor = "currentColor",
  menuColorMode = "light",
  menuProps = {},
  ...btnProps
}) {
  const [query, setQuery] = useState("");
  const isMenuOpen = menuProps?.isOpen;

  useEffect(() => {
    if (!isMenuOpen) setQuery("");
  }, [isMenuOpen]);

  const norm = (opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt;

  const list = useMemo(() => options.map(norm), [options]);

  const filtered = useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((o) => (o.label ?? "").toLowerCase().includes(q));
  }, [list, query]);

  const current = list.find((o) => o.value === value);
  const currentLabel = current?.label ?? "";
  const isNode = React.isValidElement(currentLabel);

  const isDarkMenu = menuColorMode === "dark";

  return (
    <Menu isLazy placement={menuPlacement} {...menuProps}>
      <MenuButton
        as={Button}
        w={w}
        variant="outline"
        fontWeight="normal"
        rightIcon={<ChevronDownIcon color={iconColor} />}
        justifyContent="space-between"
        isDisabled={disabled}
        {...btnProps}
      >
        <HStack w="full" justify="space-between">
          {value ? (
            isNode ? (
              <Box as="span">
                {currentLabel}
              </Box>
            ) : (
              <Text isTruncated color="inherit">{currentLabel}</Text>
            )
          ) : (
            <Text isTruncated color="gray.500">{placeholder}</Text>
          )}
          {/* clear icon intentionally removed */}
        </HStack>
      </MenuButton>

      {/* Portal evita che il menu venga tagliato dai container */}
      <Portal>
        <MenuList
          p={0}
          shadow="lg"
          zIndex={menuZIndex}
          bg={isDarkMenu ? "rgba(4, 6, 20, 1)" : undefined}
          color={isDarkMenu ? "gray.200" : undefined}
          borderColor={isDarkMenu ? "whiteAlpha.200" : undefined}
        >
          <Box p={2} borderBottom="1px" borderColor={isDarkMenu ? "whiteAlpha.200" : "gray.100"} bg={isDarkMenu ? "rgba(4, 6, 20, 0.98)" : undefined}>
            <HStack>
              <Icon as={SearchIcon} color={isDarkMenu ? "gray.400" : "gray.400"} />
              <Input
                size="sm"
                variant="unstyled"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                color={isDarkMenu ? "gray.200" : undefined}
                _placeholder={{ color: isDarkMenu ? "gray.500" : undefined }}
              />
            </HStack>
          </Box>

          <Box maxH={maxH} overflowY="auto" py={1} bg={isDarkMenu ? "rgba(4, 6, 20, 1)" : undefined}>
            {filtered.length === 0 ? (
              <Box px={3} py={2}>
                <Text fontSize="sm" color={isDarkMenu ? "gray.400" : "gray.500"}>Nessun risultato</Text>
              </Box>
            ) : (
              filtered.map((o) => (
                <MenuItem
                  key={o.value}
                  onClick={() => onChange(o.value)}
                  icon={value === o.value ? <CheckIcon /> : undefined}
                  bg={isDarkMenu ? "transparent" : undefined}
                  color={isDarkMenu ? "gray.200" : undefined}
                  _hover={isDarkMenu ? { bg: "whiteAlpha.100" } : undefined}
                >
                  {o.menuLabel ?? o.label}
                </MenuItem>
              ))
            )}
          </Box>
        </MenuList>
      </Portal>
    </Menu>
  );
}
