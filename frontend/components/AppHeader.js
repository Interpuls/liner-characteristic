// components/AppHeader.js
import NextLink from "next/link";
import Image from "next/image";
import React from "react";
import {
  Box,
  Grid,
  GridItem,
  HStack,
  VStack,
  Heading,
  Text,
  IconButton,
  Hide,
  Show,
} from "@chakra-ui/react";
import { InfoOutlineIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import { FiLogOut } from "react-icons/fi";

/**
 * AppHeader – header riusabile con banda blu e contenuti flessibili (mobile-first).
 *
 * Props:
 * - title: string
 * - subtitle?: string
 * - leftIcon?: React.ElementType          // es: LuFlaskConical, FiPackage, FiBarChart2
 * - logoSrc?: string                      // mostrato se NON c'è backHref
 * - backHref?: string                     // se presente mostra freccia back
 * - bg?: string (default "#12305f")
 * - color?: string (default "white")
 * - rightArea?: React.ReactNode           // azioni extra a destra
 * - onLogoutClick?: () => void            // mostra Logout **solo desktop** se passato
 * - showInfo?: boolean (default true)     // mostra/nasconde Info
 * - infoHref?: string (default "/information")
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
      <Box maxW="6xl" mx="auto" px={{ base: 3, md: 8 }} py={{ base: 3, md: 4 }}>
        <Grid
          templateColumns="auto 1fr auto"
          alignItems="center"
          columnGap={{ base: 2, md: 3 }}
        >
          {/* Colonna SINISTRA: back o logo */}
          <GridItem>
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
          </GridItem>

          {/* Colonna CENTRALE: icona + titolo + sottotitolo */}
          <GridItem minW={0}>
            <HStack spacing={{ base: 2, md: 3 }} align="center" minW={0}>
              {LeftIcon ? (
                <Box as={LeftIcon} boxSize={{ base: 5, md: 7 }} color="whiteAlpha.900" />
              ) : null}
              <VStack align="start" spacing={0} minW={0}>
                <Heading
                  // più grande su mobile, 2 righe max
                  fontSize={{ base: "xl", md: "lg" }}
                  lineHeight={{ base: "1.2", md: "1.2" }}
                  letterSpacing="-0.01em"
                  color="white"
                  noOfLines={{ base: 2, md: 1 }}
                  wordBreak="break-word"
                >
                  {title}
                </Heading>
                {subtitle ? (
                  <Text
                    fontSize={{ base: "xs", md: "sm" }}
                    color="whiteAlpha.800"
                    noOfLines={{ base: 3, md: 2 }}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </VStack>
            </HStack>
          </GridItem>

          {/* Colonna DESTRA: Info/Logout + area custom */}
          <GridItem justifySelf="end" minW={0}>
            <HStack spacing={1}>
              {rightArea}
              {/* Desktop: Info opzionale + Logout (se passato) */}
              <Hide below="md">
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
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
