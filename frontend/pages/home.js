// pages/home.js
import { useEffect, useState, useRef } from "react";
import NextLink from "next/link";
import {
  Box, Button, Heading, SimpleGrid, LinkBox, LinkOverlay,
  Text, HStack, useToast, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useDisclosure, Show, Icon, Center, useBreakpointValue
} from "@chakra-ui/react";

import { getToken, clearToken } from "../lib/auth";
import { getMe } from "../lib/api";

// Icone card
import { FiSearch, FiCreditCard, FiSliders, FiPackage, FiBarChart2 } from "react-icons/fi";
import { LuFlaskConical } from "react-icons/lu";

// Componenti UI rebranding (creati in /components)
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

// Card di navigazione (UI only)
function NavCard({ href, title, desc, icon: IconComp, iconBg = "gray.100", titleColor = "black" }) {
  return (
    <LinkBox
      as="article"
      p={5}
      borderWidth="1px"
      rounded="xl"
      bg="white"
      borderColor="gray.200"
      transition="all 0.2s ease"
      _hover={{ transform: "translateY(-3px)", shadow: "md", borderColor: "blue.300" }}
      role="group"
    >
      <HStack justify="space-between" mb={2} align="center">
        <HStack spacing={3} align="center">
          {IconComp && (
            <Center
              w="40px"
              h="40px"
              rounded="full"
              bg={iconBg}
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Icon as={IconComp} boxSize={5} color="#12305f" />
            </Center>
          )}
          <Heading
            size="md"
            color={titleColor}
            _groupHover={{ color: "#0f2a52" }}
            transition="color 0.2s ease"
          >
            <LinkOverlay as={NextLink} href={href}>{title}</LinkOverlay>
          </Heading>
        </HStack>
      </HStack>
      <Text color="gray.600">{desc}</Text>
    </LinkBox>
  );
}

export default function Home() {
  const [role, setRole] = useState(null);
  const toast = useToast();

  // Dialog logout
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  // 🔧 Hook UI sempre chiamato prima di qualsiasi early return (evita errore hooks)
  const topSpacing = useBreakpointValue({ base: 4, md: 6 });

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
        toast({ status: "error", title: "Sessione scaduta" });
        window.location.replace("/login");
      });
  }, [toast]);

  if (!role) return <Box p="8">Loading…</Box>;
  const isAdmin = role === "admin";

  return (
    <>
      {/* Header: banda blu, titolo bianco, icona Info; su desktop include anche icona Logout rossa */}
      <AppHeader
        title="Liner Database"
        logoSrc="/favicon.ico"
        onLogoutClick={onOpen} // l’icona logout desktop apre il dialog
      />

      {/* Contenuto */}
      <Box as="main" maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} pt={topSpacing}>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          <NavCard
            href="/product"
            title="Liner Search"
            desc="Search and view liner graphs."
            icon={FiSearch}
            iconBg="blue.50"
            titleColor="#12305f"
          />
          <NavCard
            href="/idcard"
            title="Liner ID Card"
            desc="Detail liner ID card."
            icon={FiCreditCard}
            iconBg="blue.50"
            titleColor="#12305f"
          />
          <NavCard
            href="/compare"
            title="Setting Calculator"
            desc="Compare two liners models."
            icon={FiSliders}
            iconBg="blue.50"
            titleColor="#12305f"
          />
          {isAdmin && (
            <>
              <NavCard
                href="/admin/product"
                title="Manage Products"
                desc="Manage liner / models."
                icon={FiPackage}
                iconBg="green.50"
              />
              <NavCard
                href="/admin/tests"
                title="Tests Campaign"
                desc="Laboratory workspace."
                icon={LuFlaskConical}
                iconBg="green.50"
              />
              <NavCard
                href="/admin/kpis"
                title="KPI Scales"
                desc="Define scales for each KPI."
                icon={FiBarChart2}
                iconBg="green.50"
              />
            </>
          )}
        </SimpleGrid>

        {/* MOBILE: Logout in fondo, sopra al footer */}
        <Show below="md">
          <HStack mt={8} justify="center">
            <Button size="md" width="50%" colorScheme="red" onClick={onOpen}>
              Logout
            </Button>
          </HStack>
        </Show>
      </Box>

      {/* Footer grigino minimal */}
      <AppFooter appName="Liner Characteristic App" />

      {/* AlertDialog di conferma logout */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent marginInline={2}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Logout
            </AlertDialogHeader>

            <AlertDialogBody>
              Sei sicuro di voler uscire?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Annulla
              </Button>
              <Button colorScheme="red" onClick={handleConfirmLogout} ml={3}>
                Esci
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
