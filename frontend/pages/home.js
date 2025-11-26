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
import { getMe, updateMyUnitSystem } from "../lib/api";
import { FiSearch, FiCreditCard, FiSliders } from "react-icons/fi";
import { RxHamburgerMenu } from "react-icons/rx";
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
  const [me, setMe] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const [savingUnit, setSavingUnit] = useState(false);
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
      .then((user) => {
        setMe(user);
        setUnitSystem(user?.unit_system || "metric");
      })
      .catch(() => {
        clearToken();
        toast({ status: "error", title: "Session expired" });
        window.location.replace("/login");
      });
  }, [toast]);

  const handleUnitSystemChange = async (next) => {
    if (!next || next === unitSystem) return;
    const prev = unitSystem;
    setUnitSystem(next);
    const token = getToken();
    if (!token) { window.location.replace("/login"); return; }
    setSavingUnit(true);
    try {
      await updateMyUnitSystem(token, next);
      toast({ status: "success", title: "Unit system updated", duration: 1800 });
    } catch (err) {
      setUnitSystem(prev);
      toast({
        status: "error",
        title: "Unable to update unit system",
        description: err?.message || "Try again later",
      });
    } finally {
      setSavingUnit(false);
    }
  };

  if (!me) return <Box p="8">Loading…</Box>;
  const isAdmin = me?.role === "admin";

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
    </HStack>
  );

  const HeroUser = () => (
    <Box position="relative" overflow="hidden" py={{ base: 24, md: 24 }}>
      {/* Mobile burger inside hero */}
      <Show below="md">
        <IconButton
          aria-label="Open menu"
          icon={<RxHamburgerMenu />}
          position="absolute"
          top={3}
          left={3}
          zIndex={2}
          variant="ghost"
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
          _active={{ bg: "whiteAlpha.300" }}
          onClick={menuCtrl.onOpen}
        />
      </Show>
      <Box position="absolute" inset={0} zIndex={0}
           bgGradient="linear(180deg, rgba(13,39,82,1) 0%, rgba(18,48,95,1) 35%, rgba(5,21,49,1) 100%)" />
      <Box
        position="absolute"
        top={{ base: "-60%", md: "-20%" }}
        left="50%"
        transform="translateX(-50%)"
        w={{ base: "120vw", md: "1200px" }}
        h={{ base: "120vw", md: "1200px" }}
        borderRadius="full"
        bgGradient="radial(closest-side, rgba(72,118,255,0.45), transparent 70%)"
        filter="blur(70px)"
      />
      {/* Secondary soft glow for mobile center fill */}
      <Box
        position="absolute"
        top={{ base: "-10%", md: "10%" }}
        left="50%"
        transform="translateX(-50%)"
        w={{ base: "80vw", md: "800px" }}
        h={{ base: "80vw", md: "800px" }}
        borderRadius="full"
        bgGradient="radial(closest-side, rgba(88,140,255,0.25), transparent 70%)"
        filter="blur(60px)"
      />

      <VStack position="relative" zIndex={1} spacing={5}>
        <Image src="/favicon.ico" alt="Logo" width={72} height={72} />
        <Heading size={{ base: "xl", md: "2xl" }} color="white" textAlign="center" letterSpacing="wide">Liner Characteristic</Heading>
        <Text color="whiteAlpha.800" textAlign="center" maxW="2xl">Explore liners, compare KPIs and find the best fit.</Text>
        <HStack mt={{ base: 6, md: 8 }}>
          <Button
            as={NextLink}
            href="/product"
            size="lg"
            borderRadius="9999px"
            position="relative"
            overflow="hidden"
            color="#0c1a3a"
            borderWidth="1px"
            borderColor="whiteAlpha.400"
            bgGradient="linear(135deg, rgba(255,255,255,0.10) 0%, rgba(43,108,176,0.42) 50%, rgba(255,255,255,0.08) 100%)"
            backdropFilter={{ base: "saturate(130%) blur(6px)", md: "saturate(150%) blur(10px)" }}
            boxShadow="0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)"
            _hover={{
              bgGradient: "linear(135deg, rgba(255,255,255,0.14) 0%, rgba(49,130,206,0.52) 50%, rgba(255,255,255,0.12) 100%)",
              borderColor: "whiteAlpha.600",
              boxShadow: "0 12px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.22)",
              transform: "translateY(-1px)",
            }}
            _active={{
              transform: "translateY(0)",
              bgGradient: "linear(135deg, rgba(255,255,255,0.10) 0%, rgba(43,108,176,0.36) 50%, rgba(255,255,255,0.08) 100%)",
            }}
            transition="all 0.2s ease"
            sx={{
              _before: {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(80% 140% at 20% 0%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                pointerEvents: 'none',
              },
            }}
          >
            Start Search
          </Button>
        </HStack>
      </VStack>
    </Box>
  );

  const SectionRow = ({ title }) => (
    <Box>
      <Heading size="sm" color="gray.400" mb={2}>Teat size: {title}</Heading>
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
      <Hide below="md">
        <AppHeader title="Liner Database" logoSrc="/favicon.ico" onLogoutClick={onOpen} rightArea={<RightArea />} />
      </Hide>

        <Box as="main" bg="#0b1f45" minH="100vh">
          <HeroUser />
          <Box
            maxW="7xl"
            mx="auto"
            px={{ base: 4, md: 8 }}
            pb={16}
            pt={{ base: 8, md: 8 }}
            bg="rgba(12, 26, 58, 0.55)"
            borderTopLeftRadius={{ base: "2xl", md: "3xl" }}
            borderTopRightRadius={{ base: "2xl", md: "3xl" }}
            boxShadow="0 -10px 30px rgba(0,0,0,0.35)"
            backdropFilter="saturate(120%) blur(6px)"
          >
            <Heading size="md" color="gray.300" mb={4} mt={0}>Performance Rankings</Heading>
            <SimpleGrid columns={{ base: 1 }} gap={6}>
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
        <DrawerContent backgroundColor="rgba(4, 6, 20, 1)">
          <DrawerCloseButton color="gray.400" _hover={{ color: "gray.300" }} />
          <DrawerHeader color="gray.100">Menu</DrawerHeader>
          <DrawerBody>
            <Stack spacing={5} mt={1}>
              <Box>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={2}>
                  Pages
                </Text>
                <Stack spacing={2}>
                  <Button
                    as={NextLink}
                    href="/product"
                    variant="ghost"
                    color="gray.200"
                    justifyContent="flex-start"
                    onClick={menuCtrl.onClose}
                  >
                    Browse Products
                  </Button>
                  {isAdmin && (
                    <>
                      <Button as={NextLink} href="/admin/product" variant="ghost" color="gray.200" justifyContent="flex-start" onClick={menuCtrl.onClose}>
                        Manage Product
                      </Button>
                      <Button as={NextLink} href="/admin/tests" variant="ghost" color="gray.200" justifyContent="flex-start" onClick={menuCtrl.onClose}>
                        Test Campaign
                      </Button>
                      <Button as={NextLink} href="/admin/kpis" variant="ghost" color="gray.200" justifyContent="flex-start" onClick={menuCtrl.onClose}>
                        KPI Scales
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>


              <Box>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={4}>
                  Settings
                </Text>
                <Stack spacing={3}>
                  <HStack
                    justify="space-between"
                    align="center"
                    p={3}
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    borderRadius="md"
                  >
                    <Box>
                      <Text fontSize="sm" color="gray.100">Unit system</Text>
                      <Text fontSize="xs" color="gray.400">
                        {unitSystem === "imperial" ? "Imperial" : "Metric"}
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant={unitSystem === "metric" ? "solid" : "outline"}
                        colorScheme="blue"
                        isDisabled={savingUnit}
                        onClick={() => handleUnitSystemChange("metric")}
                      >
                        Metric
                      </Button>
                      <Button
                        size="sm"
                        variant={unitSystem === "imperial" ? "solid" : "outline"}
                        colorScheme="blue"
                        isDisabled={savingUnit}
                        onClick={() => handleUnitSystemChange("imperial")}
                      >
                        Imperial
                      </Button>
                    </HStack>
                  </HStack>
                </Stack>
              </Box>

              <CkDivider />

              <Button backgroundColor="rgba(20, 23, 41, 1)" color="white" onClick={() => { menuCtrl.onClose(); onOpen(); }}>
                Logout
              </Button>
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
