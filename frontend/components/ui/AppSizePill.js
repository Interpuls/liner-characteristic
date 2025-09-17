// components/ui/AppSizePill.jsx
import { Box } from "@chakra-ui/react";

function AppSizePill({ children, color = "teal" }) {
  return (
    <Box
      as="span"
      bg={`${color}.100`}
      color={`${color}.800`}
      px={3}
      py={1}
      rounded="full"
      fontWeight="600"
      fontSize="md"
      lineHeight="1"
      display="inline-block"
    >
      {children}
    </Box>
  );
}

export default AppSizePill;
export { AppSizePill }; 
