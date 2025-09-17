import NextLink from "next/link";
import { Link, VisuallyHidden } from "@chakra-ui/react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

export function BackHomeIcon() {
  return (
    <Link
      as={NextLink}
      href="/home"
      aria-label="Home"
      display="inline-flex"
      alignItems="center"
      p="1"
      _hover={{ textDecoration: "none", transform: "translateX(-2px)" }}
      _focusVisible={{ boxShadow: "none" }}
    >
      <ChevronLeftIcon boxSize={6} />
      <VisuallyHidden>Home</VisuallyHidden>
    </Link>
  );
}
