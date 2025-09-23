// components/AppHeader.js
import NextLink from "next/link";
import Image from "next/image";
import {
  Box, HStack, Heading, Spacer, IconButton, Hide, Show
} from "@chakra-ui/react";
import { InfoOutlineIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { FiLogOut } from "react-icons/fi";

/**
 * Props:
 * - title: string
 * - logoSrc?: string
 * - backHref?: string
 * - bg?: string (default #12305f)
 * - color?: string (default white)
 * - onLogoutClick?: () => void  // Se presente, mostra l'icona Logout su desktop
 */
export default function AppHeader({
  title = "Liner Database",
  logoSrc,
  backHref,
  bg = "#12305f",
  color = "white",
  onLogoutClick,
}) {
  return (
    <Box as="header" bg={bg} color={color} w="100%" boxShadow="sm">
      <Box maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} py={{ base: 3, md: 4 }}>
        <HStack align="center">
          <HStack spacing={3}>
            {backHref ? (
              <IconButton
                as={NextLink}
                href={backHref}
                aria-label="Back"
                icon={<ChevronLeftIcon boxSize={6} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              />
            ) : logoSrc ? (
              <Image src={logoSrc} alt={title} width={28} height={28} />
            ) : null}

            <Heading size="md" color="white">{title}</Heading>
          </HStack>

          <Spacer />

          {/* Desktop: Info sempre; Logout solo se onLogoutClick è passato */}
          <Hide below="md">
            <HStack spacing={1}>
              <IconButton
                as={NextLink}
                href="/information"
                aria-label="Info"
                icon={<InfoOutlineIcon />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              />
              {onLogoutClick && (
                <IconButton
                  aria-label="Logout"
                  icon={<FiLogOut />}
                  size="sm"
                  variant="ghost"
                  color="red.500"
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={onLogoutClick}
                />
              )}
            </HStack>
          </Hide>

          {/* Mobile: solo Info */}
          <Show below="md">
            <IconButton
              as={NextLink}
              href="/information"
              aria-label="Info"
              icon={<InfoOutlineIcon />}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
            />
          </Show>
        </HStack>
      </Box>
    </Box>
  );
}
