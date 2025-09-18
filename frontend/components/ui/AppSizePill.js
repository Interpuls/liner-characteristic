import { Box, Text, useColorModeValue } from "@chakra-ui/react";

/**
 * AppSizePill (two-piece pill)
 * - sinistra: label grigia ("Teat size:")
 * - destra: valore colorato (es. "40 mm")
 *
 * Props:
 *  - color: Chakra colorScheme base (es. "blue", "teal", "purple") -> applicato a destra
 *  - size: "xs" | "sm" | "md" | "lg"  (padding e font)
 *  - label: testo a sinistra (default "Teat size:")
 *
 * Uso:
 *  <AppSizePill color="blue" size="sm">40 mm</AppSizePill>
 */
export function AppSizePill({
  children,
  color = "blue",
  size = "md",
  label = "Teat size:",
  ...rest
}) {
  const sizes = {
    xs: { px: 2,   py: 0.5, fontSize: "xs" },
    sm: { px: 2.5, py: 1,   fontSize: "sm" },
    md: { px: 3,   py: 1.5, fontSize: "sm" },
    lg: { px: 4,   py: 2,   fontSize: "md" },
  };
  const s = sizes[size] || sizes.md;

  const borderColor = useColorModeValue("gray.200", "gray.600");
  const leftBg      = useColorModeValue("gray.100", "gray.700");
  const leftColor   = useColorModeValue("gray.700", "gray.100");
  const rightBg     = useColorModeValue(`${color}.100`, `${color}.600`);
  const rightColor  = useColorModeValue(`${color}.800`, "white");

  return (
    <Box
      display="inline-flex"
      alignItems="center"
      borderRadius="full"
      overflow="hidden"
      borderWidth="0px"
      borderColor={borderColor}
      {...rest}
    >
      <Box bg={leftBg} color={leftColor} px={s.px} py={s.py}>
        <Text fontSize={s.fontSize} fontWeight="semibold">
          {label}
        </Text>
      </Box>
      <Box bg={rightBg} color={rightColor} px={s.px} py={s.py}>
        <Text fontSize={s.fontSize} fontWeight="semibold">
          {children}
        </Text>
      </Box>
    </Box>
  );
}

export default AppSizePill;
