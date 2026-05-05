import { useEffect, useRef, useState } from "react";
import { FiUsers, FiTrash2, FiKey, FiPlus } from "react-icons/fi";
import {
  Box,
  Button,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  IconButton,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Stack,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
  Center,
  Spinner,
} from "@chakra-ui/react";
import AppHeader from "@/components/AppHeader";
import PageLoader from "@/components/ui/PageLoader";
import { getToken } from "@/lib/auth";
import { listUsers, createUser, deleteUser, resetUserPassword } from "@/lib/api";

const capitalize = (value) =>
  typeof value === "string" && value.length > 0
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "";

export default function AdminUsers() {
  const toast = useToast();
  const [token, setToken] = useState(null);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "user",
    unit_system: "metric",
  });
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const createDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();
  const resetDisclosure = useDisclosure();
  const cancelRef = useRef();

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await listUsers(token);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Unable to load users",
        description: err?.message || "Please try again.",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace("/login");
      return;
    }
    setToken(t);
  }, []);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token]);

  const openDeleteDialog = (user) => {
    setDeleteTarget(user);
    deleteDisclosure.onOpen();
  };

  const openResetDialog = (user) => {
    setResetTarget(user);
    setResetPasswordValue("");
    resetDisclosure.onOpen();
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Validation error",
        description: "Email and password are required.",
        status: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      await createUser(token, newUser);
      toast({ title: "User created", status: "success" });
      setNewUser({ email: "", password: "", role: "user", unit_system: "metric" });
      createDisclosure.onClose();
      await loadUsers();
    } catch (err) {
      toast({
        title: "Create failed",
        description: err?.message || "Unable to create user.",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await deleteUser(token, deleteTarget.id);
      toast({ title: "User deleted", status: "success" });
      setUsers((prev) => prev?.filter((user) => user.id !== deleteTarget.id) ?? []);
      deleteDisclosure.onClose();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Unable to delete user.",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetPasswordValue) {
      toast({
        title: "Validation error",
        description: "New password is required.",
        status: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      await resetUserPassword(token, resetTarget.id, resetPasswordValue);
      toast({ title: "Password reset", status: "success" });
      resetDisclosure.onClose();
    } catch (err) {
      toast({
        title: "Reset failed",
        description: err?.message || "Unable to reset password.",
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <PageLoader />;

  return (
    <>
      <AppHeader
        title="User Management"
        subtitle="List, create, delete, and reset passwords for application users."
        leftIcon={FiUsers}
        backHref="/"
        showInfo={false}
      />

      <Box as="main" maxW="6xl" mx="auto" px={{ base: 4, md: 8 }} pt={4} pb={8}>
        <Stack spacing={4} mb={6} direction={{ base: "column", md: "row" }} align="start" justify="space-between">
          <Box>
            <Heading size="md">Manage user accounts</Heading>
            <Text color="gray.600" mt={2} maxW="2xl">
              Create new company users, reset passwords, or remove inactive accounts.
            </Text>
          </Box>
          <Button leftIcon={<FiPlus />} colorScheme="green" onClick={createDisclosure.onOpen} size="sm">
            New user
          </Button>
        </Stack>

        <Card>
          <CardBody>
            {loading ? (
              <Center py={20}>
                <Spinner size="xl" />
              </Center>
            ) : !users || users.length === 0 ? (
              <Box py={16} textAlign="center">
                <Text fontSize="lg" color="gray.600" mb={3}>
                  No users found.
                </Text>
                <Button colorScheme="blue" onClick={loadUsers} size="sm">
                  Refresh
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Unit system</Th>
                      <Th>Active</Th>
                      <Th>First login</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {users.map((user) => (
                      <Tr key={user.id}>
                        <Td>{user.email}</Td>
                        <Td>{capitalize(user.role)}</Td>
                        <Td>{capitalize(user.unit_system)}</Td>
                        <Td>
                          <Badge colorScheme={user.is_active ? "green" : "red"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={user.is_first_login ? "orange" : "green"}>
                            {user.is_first_login ? "Pending" : "Done"}
                          </Badge>
                        </Td>
                        <Td textAlign="right">
                          <Stack direction="row" spacing={2} justify="flex-end">
                            <IconButton
                              aria-label="Reset password"
                              icon={<FiKey />}
                              size="sm"
                              variant="outline"
                              onClick={() => openResetDialog(user)}
                            />
                            <IconButton
                              aria-label="Delete user"
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => openDeleteDialog(user)}
                            />
                          </Stack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={createDisclosure.isOpen} onClose={createDisclosure.onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create new user</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={newUser.email}
                    type="email"
                    placeholder="user@milkrite-interpuls.com"
                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    value={newUser.password}
                    type="password"
                    placeholder="Enter temporary password"
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </FormControl>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <FormControl>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={newUser.role}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Unit system</FormLabel>
                    <Select
                      value={newUser.unit_system}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, unit_system: e.target.value }))}
                    >
                      <option value="metric">Metric</option>
                      <option value="imperial">Imperial</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
                <Text color="gray.600" fontSize="sm">
                  The new user will be created with a temporary password and must change it at first login.
                </Text>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={createDisclosure.onClose}>
                Cancel
              </Button>
              <Button colorScheme="green" onClick={handleCreateUser} isLoading={saving}>
                Create user
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={resetDisclosure.isOpen} onClose={resetDisclosure.onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Reset password</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack spacing={4}>
                <Text>
                  Reset password for <strong>{resetTarget?.email}</strong>.
                </Text>
                <FormControl>
                  <FormLabel>New password</FormLabel>
                  <Input
                    value={resetPasswordValue}
                    type="password"
                    placeholder="Enter new temporary password"
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                  />
                </FormControl>
                <Text color="gray.600" fontSize="sm">
                  The user will be required to sign in again and set a new password.
                </Text>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={resetDisclosure.onClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleResetPassword} isLoading={saving}>
                Reset password
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <AlertDialog
          isOpen={deleteDisclosure.isOpen}
          leastDestructiveRef={cancelRef}
          onClose={deleteDisclosure.onClose}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete user
              </AlertDialogHeader>

              <AlertDialogBody>
                Are you sure you want to delete <strong>{deleteTarget?.email}</strong>? This action cannot be undone.
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={deleteDisclosure.onClose} mr={3}>
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={handleDeleteUser} isLoading={saving}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </Box>
    </>
  );
}
