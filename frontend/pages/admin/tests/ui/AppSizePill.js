// ui/AppSizePill.jsx (oppure in testa al file)
import { Box } from "@chakra-ui/react";

export function AppSizePill({ children, color="teal" }) {
  return (
    <Box
      as="span"
      bg={`${color}.100`}
      color={`${color}.800`}
      px={3}
      py={1}
      rounded="full"
      fontWeight="600"
      fontSize="md"        // <— più grande del precedente "sm"
      lineHeight="1"
      display="inline-block"
    >
      {children}
    </Box>
  );
}
