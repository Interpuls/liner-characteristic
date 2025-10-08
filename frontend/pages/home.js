// pages/home.js
import { useEffect, useState, useRef } from "react";
import NextLink from "next/link";
import Image from "next/image";
import {
  Box, Button, Heading, SimpleGrid, LinkBox, LinkOverlay,
  Text, HStack, VStack, useToast, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useDisclosure, Show, Hide, Icon, Center, useBreakpointValue,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton,
  Stack, IconButton, Divider as CkDivider
} from "@chakra-ui/react";
import { getToken, clearToken } from "../lib/auth";
import { getMe } from "../lib/api";
import { FiSearch, FiCreditCard, FiSliders } from "react-icons/fi";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

function NavCard({ href, title, desc, icon: IconComp }) {
  return (
    <LinkBox as="article" p={5} borderWidth="1px" rounded="xl" bg="white" borderColor="gray.200" transition="all 0.2s ease" _hover={{ transform: "translateY(-3px)", shadow: "md", borderColor: "blue.300" }} role="group">
      <HStack spacing={3} align="center" mb={2}>
        {IconComp && (
          <Center w="40px" h="40px" rounded="full" bg="blue.50" borderWidth="1px" borderColor="gray.200">
            <Icon as={IconComp} boxSize={5} color="#12305f" />
          </Center>
        )}
        <Heading size="md" color="#12305f" _groupHover={{ color: "#0f2a52" }} transition="color 0.2s ease">
          <LinkOverlay as={NextLink} href={href}>{title}</LinkOverlay>
        </Heading>
      </HStack>
      <Text color="gray.600">{desc}</Text>
    </LinkBox>
  );
}

export default function Home() {
  const [role, setRole] = useState(null);
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const topSpacing = useBreakpointValue({ base: 4, md: 6 });
  // mobile drawer (burger menu)
  const menuCtrl = useDisclosure();

  const handleConfirmLogout = () => {
    clearToken();
    window.location.replace("/login");
  };

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t)
      .then((me) => setRole(me.role))
      .catch(() => {
        clearToken();
        toast({ status: "error", title: "Session expired" });
        window.location.replace("/login");
      });
  }, [toast]);

  if (!role) return <Box p="8">Loading…</Box>;
  const isAdmin = role === "admin";

  const AdminNav = () => (
    <HStack spacing={3} align="center">
      <Hide below="md">
        <Button as={NextLink} href="/admin/product" size="sm" variant="ghost" color="whiteAlpha.900" _hover={{ bg: "whiteAlpha.200" }}>Manage Product</Button>
        <Button as={NextLink} href="/admin/tests" size="sm" variant="ghost" color="whiteAlpha.900" _hover={{ bg: "whiteAlpha.200" }}>Test Campaign</Button>
        <Button as={NextLink} href="/admin/kpis" size="sm" variant="ghost" color="whiteAlpha.900" _hover={{ bg: "whiteAlpha.200" }}>KPI Scales</Button>
      </Hide>
    </HStack>
  );

  const RightArea = () => (
    <HStack spacing={2}>
      {isAdmin && <AdminNav />}
      {/* Burger shown on mobile for both roles */}
      <Show below="md">
        <IconButton aria-label="Menu" icon={<Icon viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2"/></Icon>} size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={menuCtrl.onOpen} />
      </Show>
    </HStack>
  );

  const HeroUser = () => (
    <Box position="relative" overflow="hidden" py={{ base: 16, md: 24 }}>
      <Box position="absolute" inset={0} zIndex={0}
           bgGradient="linear(180deg, rgba(13,39,82,1) 0%, rgba(18,48,95,1) 35%, rgba(5,21,49,1) 100%)" />
      <Box position="absolute" top="-20%" left="50%" transform="translateX(-50%)" w="1200px" h="1200px" borderRadius="full"
           bgGradient="radial(closest-side, rgba(72, 118, 255, 0.35), transparent 70%)" filter="blur(60px)" />

      <VStack position="relative" zIndex={1} spacing={5}>
        <Image src="/favicon.ico" alt="Logo" width={72} height={72} />
        <Heading size={{ base: "xl", md: "2xl" }} color="white" textAlign="center" letterSpacing="wide">Liner Characteristic</Heading>
        <Text color="whiteAlpha.800" textAlign="center" maxW="2xl">Explore liners, compare KPIs and find the best fit.</Text>
        <HStack>
          <Button as={NextLink} href="/product" size="lg" colorScheme="blue" bg="#2b6cb0" _hover={{ bg: "#2c5282" }}>Start Search</Button>
        </HStack>
      </VStack>
    </Box>
  );

  const SectionRow = ({ title }) => (
    <Box>
      <Heading size="sm" color="gray.200" mb={2}>{title}</Heading>
      <HStack spacing={4} overflowX="auto" py={2} px={1}>
        {[1,2,3,4].map((i) => (
          <Box key={i} minW="220px" p={4} borderWidth="1px" borderColor="whiteAlpha.200" bg="whiteAlpha.100" rounded="lg">
            <Text fontWeight="semibold" color="white">Closure</Text>
            <Text fontSize="sm" color="whiteAlpha.800">Top 4 preview • #{i}</Text>
          </Box>
        ))}
      </HStack>
    </Box>
  );

  return (
    <>
      <AppHeader title="Liner Database" logoSrc="/favicon.ico" onLogoutClick={onOpen} rightArea={<RightArea />} />

        <Box as="main" bg="#0b1f45" minH="100vh">
          <HeroUser />
          <Box maxW="7xl" mx="auto" px={{ base: 4, md: 8 }} pb={16}>
            <SimpleGrid columns={{ base: 1 }} gap={8}>
              <SectionRow title="40" />
              <SectionRow title="50" />
              <SectionRow title="60" />
              <SectionRow title="70" />
            </SimpleGrid>
          </Box>
        </Box>

      <AppFooter appName="Liner Characteristic App" />

      {/* Mobile Drawer menu */}
      <Drawer isOpen={menuCtrl.isOpen} placement="left" onClose={menuCtrl.onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody>
            <Stack spacing={3} mt={2}>
              {isAdmin ? (
                <>
                  <Button as={NextLink} href="/admin/product" variant="ghost" onClick={menuCtrl.onClose}>Manage Product</Button>
                  <Button as={NextLink} href="/admin/tests" variant="ghost" onClick={menuCtrl.onClose}>Test Campaign</Button>
                  <Button as={NextLink} href="/admin/kpis" variant="ghost" onClick={menuCtrl.onClose}>KPI Scales</Button>
                  <Button as={NextLink} href="/settings" variant="ghost" onClick={menuCtrl.onClose}>Settings</Button>
                </>
              ) : (
                <>
                  <Button as={NextLink} href="/settings" variant="ghost" onClick={menuCtrl.onClose}>Settings</Button>
                </>
              )}
              <CkDivider />
              <Button colorScheme="red" onClick={() => { menuCtrl.onClose(); onOpen(); }}>Logout</Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent marginInline={2}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Confirm Logout</AlertDialogHeader>
            <AlertDialogBody>Are you sure you want to logout?</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleConfirmLogout} ml={3}>Logout</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
