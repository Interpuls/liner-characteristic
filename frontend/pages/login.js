import { useState } from "react";
import { Box, Button, Heading, Input, Stack, useToast } from "@chakra-ui/react";
import { login } from "../lib/api";
import { setToken } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { access_token } = await login(email, password);
      setToken(access_token);
      window.location.replace("/products");
    } catch (err) {
      toast({ status: "error", title: "Login fallito" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt="20">
      <Heading size="md" mb="4">Accedi</Heading>
      <form onSubmit={onSubmit}>
        <Stack gap="3">
          <Input placeholder="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Input placeholder="password" type="password" value={password} onChange={(e)=>setPw(e.target.value)} />
          <Button type="submit" isLoading={loading} colorScheme="blue">Login</Button>
        </Stack>
      </form>
    </Box>
  );
}
