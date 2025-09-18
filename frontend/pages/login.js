import { useEffect, useState } from "react";
import {
  Box, Button, Heading, Input, Stack, useToast, Text, Link,
} from "@chakra-ui/react";
import { loginApi, getMe } from "../lib/api";
import { setToken, getToken, clearToken } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // se già loggato, vai alla home
  useEffect(() => {
    const t = getToken();
    if (t) {
      getMe(t)
        .then(() => {
          const next = new URLSearchParams(window.location.search).get("next");
          window.location.replace(next || "/");
        })
        .catch(() => clearToken());
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token } = await loginApi(email, password);
      setToken(access_token);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.replace(next || "/");
    } catch (err) {
      console.error(err);
      console.log(err.response);
      toast({
        status: "error",
        title: "Login fallito",
        description: "Credenziali non valide o utente non autorizzato",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p="6">
      <Box w="full" maxW="sm" p="6" borderWidth="1px" rounded="lg">
        <Heading size="md" mb="4" textAlign="center">Login</Heading>
        <form onSubmit={onSubmit}>
          <Stack gap="3">
            <Input
              placeholder="company email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPw(e.target.value)}
            />
            <Button type="submit" isLoading={loading} colorScheme="blue">
              Enter
            </Button>
          </Stack>
        </form>
        <Text fontSize="sm" color="gray.500" mt="4" textAlign="center">
          Access reserved to authorized domains.
        </Text>
        <Box textAlign="center" mt="3">
          <Link color="blue.500" onClick={() => { clearToken(); window.location.reload(); }}>
            Clear session
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
