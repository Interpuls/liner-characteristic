import { useEffect, useRef, useState } from "react";
import {
  Box,
  Badge,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  Spinner,
  useDisclosure,
  useToast,
  VStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { FiInfo } from "react-icons/fi";
import { getToken } from "../../lib/auth";
import { listNews, listNewsAdmin, createNews, updateNews, deleteNews } from "../../lib/api";

export default function NewsSection({ isAdmin }) {
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsSaving, setNewsSaving] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [newsAction, setNewsAction] = useState(null);

  const toast = useToast();
  const newsPreview = useDisclosure();
  const newsConfirm = useDisclosure();
  const newsCancelRef = useRef();

  const formatNewsDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString();
  };

  const loadNews = async () => {
    const token = getToken();
    if (!token) return;
    setNewsLoading(true);
    try {
      const rows = isAdmin ? await listNewsAdmin(token) : await listNews(token);
      setNewsItems(Array.isArray(rows) ? rows : []);
    } catch {
      toast({ status: "error", title: "Unable to load news" });
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [isAdmin]);

  const openPreview = (item) => {
    setSelectedNews(item);
    newsPreview.onOpen();
  };

  const confirmAction = (type, payload) => {
    setNewsAction({ type, payload });
    newsConfirm.onOpen();
  };

  const resetNewsForm = () => {
    setNewsTitle("");
    setNewsBody("");
  };

  const handleCreateNews = async (publishNow) => {
    const token = getToken();
    if (!token) return;
    if (!newsTitle.trim() || !newsBody.trim()) {
      toast({ status: "warning", title: "Title and description are required" });
      return;
    }
    setNewsSaving(true);
    try {
      await createNews(token, {
        title: newsTitle.trim(),
        body: newsBody.trim(),
        is_published: !!publishNow,
      });
      resetNewsForm();
      await loadNews();
      toast({ status: "success", title: publishNow ? "News published" : "Draft saved" });
    } catch {
      toast({ status: "error", title: "Unable to save news" });
    } finally {
      setNewsSaving(false);
    }
  };

  const handlePublish = async (item) => {
    const token = getToken();
    if (!token) return;
    setNewsSaving(true);
    try {
      await updateNews(token, item.id, { is_published: true });
      await loadNews();
      toast({ status: "success", title: "News published" });
    } catch {
      toast({ status: "error", title: "Unable to publish news" });
    } finally {
      setNewsSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const token = getToken();
    if (!token) return;
    setNewsSaving(true);
    try {
      await deleteNews(token, item.id);
      await loadNews();
      toast({ status: "success", title: "News deleted" });
    } catch {
      toast({ status: "error", title: "Unable to delete news" });
    } finally {
      setNewsSaving(false);
    }
  };

  const handleConfirmNewsAction = async () => {
    const action = newsAction;
    newsConfirm.onClose();
    setNewsAction(null);
    if (!action) return;

    if (action.type === "publish-new") {
      await handleCreateNews(true);
      return;
    }
    if (action.type === "publish") {
      await handlePublish(action.payload);
      return;
    }
    if (action.type === "delete") {
      await handleDelete(action.payload);
    }
  };

  return (
    <>
      <Box
        mb={8}
        p={{ base: 4, md: 5 }}
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="rgba(16, 26, 54, 0.85)"
        borderRadius="xl"
      >
      <HStack spacing={2} mb={4} mt={0} align="center">
        <Box as={FiInfo} color="blue.200" boxSize={4} />
        <Heading size="md" color="gray.300">News</Heading>
      </HStack>

      {isAdmin ? (
        <Box
          p={3}
          mb={4}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="md"
          bg="rgba(10, 20, 44, 0.6)"
        >
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel color="gray.300" fontSize="sm">Title</FormLabel>
              <Input
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                bg="white"
                color="gray.800"
                placeholder="Short title"
              />
            </FormControl>
            <FormControl>
              <FormLabel color="gray.300" fontSize="sm">Description</FormLabel>
              <Textarea
                value={newsBody}
                onChange={(e) => setNewsBody(e.target.value)}
                bg="white"
                color="gray.800"
                placeholder="Write the update for users"
                rows={4}
              />
            </FormControl>
            <HStack justify="flex-end" spacing={2}>
              <Button
                variant="outline"
                onClick={() => openPreview({ title: newsTitle || "Preview", body: newsBody || "" })}
                isDisabled={!newsTitle.trim() && !newsBody.trim()}
                color="gray.200"
                borderColor="whiteAlpha.400"
                _hover={{ borderColor: "whiteAlpha.600", color: "white" }}
              >
                Preview
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleCreateNews(false)}
                isDisabled={newsSaving}
                color="gray.200"
                _hover={{ color: "white", bg: "whiteAlpha.200" }}
              >
                Save draft
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => confirmAction("publish-new")}
                isLoading={newsSaving}
              >
                Publish
              </Button>
            </HStack>
          </VStack>
        </Box>
      ) : null}

      {newsLoading ? (
        <Center py={6}>
          <Spinner size="md" color="blue.300" />
        </Center>
      ) : newsItems.length === 0 ? (
        <Text color="gray.400">No news available.</Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          {newsItems.map((item) => (
            <Box
              key={item.id}
              p={4}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="rgba(12, 22, 48, 0.65)"
            >
              <HStack justify="space-between" align="start">
                <Box>
                  <Heading size="sm" color="white" mb={1}>{item.title}</Heading>
                  <Text fontSize="sm" color="whiteAlpha.800" whiteSpace="pre-line">
                    {item.body}
                  </Text>
                </Box>
                <VStack align="end" spacing={2} minW="120px">
                  {isAdmin ? (
                    <Badge colorScheme={item.is_published ? "green" : "yellow"}>
                      {item.is_published ? "Published" : "Draft"}
                    </Badge>
                  ) : null}
                  <Text fontSize="xs" color="gray.400">
                    {formatNewsDate(item.published_at || item.created_at)}
                  </Text>
                </VStack>
              </HStack>
              {isAdmin ? (
                <HStack justify="flex-end" mt={3} spacing={2}>
                  <Button size="sm" variant="ghost" onClick={() => openPreview(item)}>
                    Preview
                  </Button>
                  {!item.is_published ? (
                    <Button size="sm" colorScheme="blue" onClick={() => confirmAction("publish", item)}>
                      Publish
                    </Button>
                  ) : null}
                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => confirmAction("delete", item)}>
                    Delete
                  </Button>
                </HStack>
              ) : null}
            </Box>
          ))}
        </VStack>
      )}

      <Modal isOpen={newsPreview.isOpen} onClose={newsPreview.onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          bg="rgba(4, 6, 20, 1)"
          color="gray.100"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          boxShadow="xl"
        >
          <ModalHeader color="white">News preview</ModalHeader>
          <ModalCloseButton color="gray.300" _hover={{ color: "white" }} />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Heading size="sm" color="white">{selectedNews?.title || "Preview"}</Heading>
              <Text fontSize="sm" color="gray.300" whiteSpace="pre-line">
                {selectedNews?.body || "No content."}
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter />
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={newsConfirm.isOpen} leastDestructiveRef={newsCancelRef} onClose={newsConfirm.onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent marginInline={2}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {newsAction?.type === "delete" ? "Delete news?" : "Publish news?"}
            </AlertDialogHeader>
            <AlertDialogBody>
              {newsAction?.type === "delete"
                ? "This will permanently remove the news item."
                : "This will publish the news to all users."}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={newsCancelRef} onClick={newsConfirm.onClose}>Cancel</Button>
              <Button
                colorScheme={newsAction?.type === "delete" ? "red" : "blue"}
                onClick={handleConfirmNewsAction}
                ml={3}
                isLoading={newsSaving}
              >
                {newsAction?.type === "delete" ? "Delete" : "Publish"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      </Box>
    </>
  );
}
