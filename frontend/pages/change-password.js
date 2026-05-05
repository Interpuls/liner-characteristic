import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { changeMyPassword, getMe } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";

function validateNewPassword(currentPassword, newPassword, confirmPassword) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return "All password fields are required.";
  }
  if (newPassword !== confirmPassword) {
    return "New password and confirmation do not match.";
  }
  if (newPassword === currentPassword) {
    return "New password must be different from current password.";
  }
  if (newPassword.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (!/\d/.test(newPassword)) {
    return "New password must include at least one number.";
  }
  if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(newPassword)) {
    return "New password must include at least one symbol.";
  }
  return "";
}

export default function ChangePasswordPage() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loadingMe, setLoadingMe] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }
    getMe(token)
      .then((me) => {
        setIsFirstLogin(!!me?.is_first_login);
      })
      .catch(() => {
        clearToken();
        window.location.replace("/login");
      })
      .finally(() => {
        setLoadingMe(false);
      });
  }, []);

  const validationError = useMemo(
    () => validateNewPassword(currentPassword, newPassword, confirmPassword),
    [currentPassword, newPassword, confirmPassword]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (validationError) {
      setError(validationError);
      return;
    }
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }
    setSaving(true);
    try {
      await changeMyPassword(token, currentPassword, newPassword);
      toast({ status: "success", title: "Password updated successfully." });
      window.location.replace("/home");
    } catch (e2) {
      setError(e2?.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMe) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.600">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader
        title="Change Password"
        subtitle={isFirstLogin ? "First access: update your password to continue" : "Update your account password"}
        backHref="/home"
        showInfo={false}
      />

      <Box as="main" flex="1" maxW="lg" w="100%" mx="auto" px={4} py={6}>
        <Stack as="form" spacing={4} onSubmit={handleSubmit}>
          <Heading size="md">Security</Heading>
          <Text fontSize="sm" color="gray.600">
            Use at least 8 characters with at least one number and one symbol.
          </Text>

          {error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <FormControl isRequired>
            <FormLabel>Current password</FormLabel>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>New password</FormLabel>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Confirm new password</FormLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormControl>

          <Stack direction={{ base: "column", md: "row" }} spacing={3} pt={2}>
            <Button type="submit" colorScheme="blue" isLoading={saving}>
              Save password
            </Button>
            {!isFirstLogin && (
              <Button as={NextLink} href="/home" variant="outline">
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
