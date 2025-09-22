// pages/home.js
import { useEffect, useState, useRef } from "react";
import NextLink from "next/link";
import Image from "next/image";
import {
  Box, Button, Heading, SimpleGrid, LinkBox, LinkOverlay,
  Text, HStack, Spacer, useToast, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useDisclosure, Hide, Show, Icon, Center
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import { getToken, clearToken } from "../lib/auth";
import { getMe } from "../lib/api";

// Icone "logo" per le card
import {
  FiSearch, FiCreditCard, FiSliders, FiPackage, FiFlask, FiBarChart2
} from "react-icons/fi";
import { LuFlaskConical } from "react-icons/lu";

function NavCard({ href, title, desc, icon: IconComp, iconBg = "gray.100", titleColor = "black" }) {
  return (
    <LinkBox
      as="article"
      p="5"
      borderWidth="1px"
      rounded="xl"
      _hover={{ shadow: "md", borderColor: "blue.300" }}
      transition="all 0.15s ease"
    >
      <HStack justify="space-between" mb="2" align="center">
        <HStack spacing={3} align="center">
          {IconComp && (
            <Center w="36px" h="36px" rounded="full" bg={iconBg} borderWidth="1px">
              <Icon as={IconComp} boxSize={5} />
            </Center>
          )}
          <Heading size="md" color={titleColor}>
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

  // Logout confirm dialog
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

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
  }, []);

  if (!role) return <Box p="8">Loading…</Box>;
  const isAdmin = role === "admin";

  return (
    <Box maxW="6xl" mx="auto" p={{ base: 4, md: 8 }}>
      {/* Header */}
      <HStack mb="6" align="center">
        <HStack spacing={3}>
          {/* Logo dell’app: metti /logo.svg o /logo.png in /public */}
          <Image src="/iconblu.ico" alt="Liner Characteristic" width={36} height={36} />  
          <Heading size="lg" color="#12305f">Liner Database</Heading>
        </HStack>
        <Spacer />
        {/* Right tools (desktop): Info + Logout */}
        <Hide below="md">
          <HStack spacing={2}>
            <Button
              as={NextLink}
              href="/information"
              leftIcon={<InfoOutlineIcon />}
              variant="ghost"
              size="sm"
            >
              Info
            </Button>
            <Button size="sm" colorScheme="red" onClick={onOpen}>
              Logout
            </Button>
          </HStack>
        </Hide>
      </HStack>

      {/* Grid delle card */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        <NavCard
          href="/product"
          title="Liner Search"
          desc="Search and view liner graphs."
          icon={FiSearch}
          iconBg="blue.100"
          titleColor="#12305f"
        />
        <NavCard
          href="/id-card"
          title="Liner ID Card"
          desc="Detail liner ID card."
          icon={FiCreditCard}
          iconBg="blue.100"
          titleColor="#12305f"
        />
        <NavCard
          href="/compare"
          title="Setting Calculator"
          desc="Compare two liners models."
          icon={FiSliders}
          iconBg="blue.100"
          titleColor="#12305f"
        />
        {isAdmin && (
          <>
            <NavCard
              href="/admin/product"
              title="Manage Products"
              desc="Manage liner / models."
              icon={FiPackage}
              iconBg="green.100"
            />
            <NavCard
              href="/admin/tests"
              title="Tests Campaign"
              desc="Laboratory workspace."
              icon={LuFlaskConical}
              iconBg="green.100"
            />
            <NavCard
              href="/admin/kpis"
              title="KPI Scales"
              desc="Define scales for each KPI."
              icon={FiBarChart2}
              iconBg="green.100"
            />
          </>
        )}
      </SimpleGrid>

      {/* Azioni (mobile): Info + Logout sotto le card */}
      <Show below="md">
        <HStack mt={6} justify="space-between">
          <Button
            as={NextLink}
            href="/information"
            leftIcon={<InfoOutlineIcon />}
            variant="outline"
            size="sm"
          >
            Info
          </Button>
          <Button size="sm" colorScheme="red" onClick={onOpen}>
            Logout
          </Button>
        </HStack>
      </Show>

      {/* AlertDialog di conferma logout */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
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
    </Box>
  );
}
