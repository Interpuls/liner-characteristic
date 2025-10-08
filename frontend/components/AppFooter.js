// components/AppFooter.js
import { Box, Text } from "@chakra-ui/react";

export default function AppFooter({
  appName = "Liner Characteristic App",
  version = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0",
}) {
  const year = new Date().getFullYear();
  return (
    <Box
      as="footer"
      w="100%"
      borderTop="1px solid"
      borderColor="gray.200"
      mt={0}
      py={4}
      bg="gray.50"   // <-- leggermente grigino
    >
      <Box maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} textAlign="center">
        <Text fontSize="sm" color="gray.600">
          © {year} {appName} · {version} · All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}
