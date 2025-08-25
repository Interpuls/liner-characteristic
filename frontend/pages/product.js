import { useEffect, useState } from "react";
import { Box, Button, Heading, HStack, Input, Stack, Table, Thead, Tbody, Tr, Th, Td, useToast } from "@chakra-ui/react";
import { getToken } from "../lib/auth";
import { getMe, listProducts, createProduct } from "../lib/api";

export default function Products() {
  const [items, setItems] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login"); return; }
    getMe(t).then(me => setIsAdmin(me.role === "admin")).catch((err) => {
    listProducts(t)
      .then(setItems)
      .catch(() => {
        setItems([]);
        toast({ status: "error", title: "Errore caricamento" });
      });
    });
    listProducts(t).then(setItems).catch(()=>toast({status:"error", title:"Errore caricamento"}));
  }, []);

  const onCreate = async () => {
    try {
      const t = getToken();
      await createProduct(t, { code, name, description: desc });
      setCode(""); setName(""); setDesc("");
      const data = await listProducts(t);
      setItems(data);
      toast({status:"success", title:"Creato"});
    } catch {
      toast({status:"error", title:"Errore creazione (serve admin)"});
    }
  };

  if (!items) return <Box p="6">Caricamento…</Box>;

  return (
    <Box maxW="5xl" mx="auto" p="6">
      <Heading size="md" mb="4">Prodotti</Heading>

      {isAdmin && (
        <Stack direction={{ base: "column", md: "row" }} gap="3" mb="6">
          <Input placeholder="Codice" value={code} onChange={(e)=>setCode(e.target.value)} />
          <Input placeholder="Nome" value={name} onChange={(e)=>setName(e.target.value)} />
          <Input placeholder="Descrizione" value={desc} onChange={(e)=>setDesc(e.target.value)} />
          <Button colorScheme="green" onClick={onCreate}>Crea</Button>
        </Stack>
      )}

      <Box overflowX="auto">
        <Table size="sm">
          <Thead><Tr><Th>ID</Th><Th>Code</Th><Th>Name</Th><Th>Descrizione</Th></Tr></Thead>
          <Tbody>
            {items.map(p => (
              <Tr key={p.id}>
                <Td>{p.id}</Td>
                <Td>{p.code}</Td>
                <Td>{p.name}</Td>
                <Td>{p.description || "-"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
