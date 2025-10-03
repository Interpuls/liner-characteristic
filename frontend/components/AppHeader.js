// components/AppHeader.js
import NextLink from "next/link";
import Image from "next/image";
import React from "react";
import {
  Box,
  HStack,
  VStack,
  Heading,
  Text,
  Spacer,
  IconButton,
  Hide,
  Show,
} from "@chakra-ui/react";
import { InfoOutlineIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { FiLogOut } from "react-icons/fi";

/**
 * AppHeader – header riusabile con banda blu e contenuti flessibili.
 *
 * Props:
 * - title: string
 * - subtitle?: string
 * - leftIcon?: React.ElementType          // es: LuFlaskConical, FiPackage, FiBarChart2
 * - logoSrc?: string                      // mostra il logo se NON c'è backHref
 * - backHref?: string                     // se presente mostra la freccia e linka a questa route
 * - bg?: string (default "#12305f")
 * - color?: string (default "white")
 * - rightArea?: React.ReactNode           // azioni extra a destra (es. menu, badge, ecc.)
 * - onLogoutClick?: () => void            // mostra bottone Logout **solo su desktop** se passato
 * - showInfo?: boolean (default true)     // mostra/nasconde il bottone Info
 * - infoHref?: string (default "/information")   // link della Info se non usi onInfoClick
 * - infoIcon?: React.ElementType (default InfoOutlineIcon)
 * - onInfoClick?: () => void              // azione custom per Info (ha precedenza su infoHref)
 */
export default function AppHeader({
  title = "Liner Database",
  subtitle,
  leftIcon: LeftIcon,
  logoSrc,
  backHref,
  bg = "#12305f",
  color = "white",
  rightArea,
  onLogoutClick,
  showInfo = true,
  infoHref = "/information",
  infoIcon: InfoIconComp = InfoOutlineIcon,
  onInfoClick,
}) {
  return (
    <Box as="header" bg={bg} color={color} w="100%" boxShadow="sm">
      <Box maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} py={{ base: 3, md: 4 }}>
        <HStack align="center" spacing={3}>
          {/* Priorità: back -> logo -> (niente) */}
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

          {/* Titolo + sottotitolo + icona a sinistra */}
          <HStack spacing={3} align="flex-start" flex="1" minW={0}>
            {LeftIcon ? <Box as={LeftIcon} boxSize={7} color="whiteAlpha.900" /> : null}
            <VStack align="start" spacing={0} minW={0}>
              <Heading size="md" color="white" noOfLines={1}>
                {title}
              </Heading>
              {subtitle ? (
                <Text fontSize="sm" color="whiteAlpha.800" noOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </VStack>
          </HStack>

          <Spacer />

          {/* Right area custom opzionale */}
          {rightArea}

          {/* Desktop: Info opzionale; Logout se passato */}
          <Hide below="md">
            <HStack spacing={1}>
              {showInfo &&
                (onInfoClick ? (
                  <IconButton
                    aria-label="Info"
                    icon={<InfoIconComp />}
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={onInfoClick}
                  />
                ) : (
                  <IconButton
                    as={NextLink}
                    href={infoHref}
                    aria-label="Info"
                    icon={<InfoIconComp />}
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                  />
                ))}

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

          {/* Mobile: solo Info (opzionale) */}
          <Show below="md">
            {showInfo &&
              (onInfoClick ? (
                <IconButton
                  aria-label="Info"
                  icon={<InfoIconComp />}
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={onInfoClick}
                />
              ) : (
                <IconButton
                  as={NextLink}
                  href={infoHref}
                  aria-label="Info"
                  icon={<InfoIconComp />}
                  size="sm"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: "whiteAlpha.200" }}
                />
              ))}
          </Show>
        </HStack>
      </Box>
    </Box>
  );
}
