import { Box, Center, Spinner } from "@chakra-ui/react";

export default function PageLoader({ minH = "100vh", bg = "transparent" }) {
  return (
    <Box minH={minH} bg={bg}>
      <Center minH={minH}>
        <Spinner size="xl" thickness="4px" color="blue.500" />
      </Center>
    </Box>
  );
}
