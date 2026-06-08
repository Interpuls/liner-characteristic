import { Box, Card, CardBody, Heading, Text, VStack, List, ListItem, ListIcon, Button, HStack } from "@chakra-ui/react";
import { CheckCircleIcon, InfoOutlineIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

export default function InformationPage() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <AppHeader title="Informazioni" subtitle="Guida alla pagina risultati prodotto" backHref="/home" />
      <Box as="main" flex="1" maxW={{ base: "100%", md: "6xl" }} mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 4, md: 6 }} w="100%">
        <VStack align="stretch" spacing={5}>
          <Card>
            <CardBody>
              <VStack align="start" spacing={4}>
                <Heading size="lg" color="#12305f">Come leggere i risultati prodotto</Heading>
                <Text color="gray.700" fontSize="md">
                  Questa pagina ti aiuta a capire la sezione risultati prodotto: qui trovi i liner che meglio corrispondono ai filtri selezionati,
                  insieme ai KPI calcolati per ciascuna applicazione.
                </Text>
                <Text color="gray.700" fontSize="md">
                  Ogni riga o card rappresenta una combinazione di marca, modello e dimensione del liner valida per il tuo case d'uso.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Cosa significa ogni sezione</Heading>
              <List spacing={3}>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    <strong>Filtri attivi</strong>: controlla i parametri applicati, ad esempio brand, modello, dimensione del capezzolo, forma del barilotto e area di riferimento.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    <strong>Risultati</strong>: ogni card mostra il liner, la sua applicazione e i punteggi KPI associati per confrontare le opzioni.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    <strong>Ordina per KPI</strong>: scegli il punteggio più importante per te (ad esempio FITTING o SPEED) per riordinare la lista dei liner.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    <strong>Pin</strong>: fissa i liner più interessanti per confrontarli rapidamente e mantenerli in evidenza.
                  </Text>
                </ListItem>
              </List>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="md" mb={3}>I KPI più importanti</Heading>
              <List spacing={3}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>CLOSURE</strong>: indica la chiusura della lente, utile per valutare il comfort e l'aderenza.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>FITTING</strong>: misura quanto bene la lente si adatta al profilo del capezzolo.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>CONGESTION_RISK</strong>: indica il rischio di congestione, basato sul comportamento di allattamento.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>HYPERKERATOSIS_RISK</strong>: stima il rischio di ispessimento del tessuto, importante per la salute della mammella.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>SPEED</strong>: indica il flusso di latte dopo un minuto, utile per valutare l'efficienza.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    <strong>RESPRAY</strong>, <strong>FLUYDODINAMIC</strong>, <strong>SLIPPAGE</strong> e <strong>RINGING_RISK</strong>: altri indicatori di performance specifici per tipo di liner.
                  </Text>
                </ListItem>
              </List>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Come usare la pagina risultati</Heading>
              <List spacing={3}>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    Applica i filtri che corrispondono al tuo caso e valuta solo i prodotti rilevanti.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    Ordina i risultati per il KPI più importante per te per concentrarti sulle opzioni migliori.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    Usa il pin per mantenere in cima i liner più interessanti e confrontarli più facilmente.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={InfoOutlineIcon} color="blue.500" />
                  <Text as="span" color="gray.700">
                    Clicca su una card per vedere i dettagli completi e le applicazioni specifiche del prodotto.
                  </Text>
                </ListItem>
              </List>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Passaggi consigliati</Heading>
              <List spacing={3}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    1. Scegli i filtri giusti per la tua stalla, dimensione del capezzolo e area di riferimento.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    2. Confronta i punteggi KPI evidenziati e seleziona i liner con valutazioni più alte nei criteri importanti.
                  </Text>
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  <Text as="span" color="gray.700">
                    3. Salva le ricerche frequenti e usa il pulsante di salvataggio per tornare rapidamente alle stesse condizioni.
                  </Text>
                </ListItem>
              </List>
              <HStack mt={4} spacing={3} flexWrap="wrap">
                <Button as="a" href="/product/result" colorScheme="blue" rightIcon={<ArrowForwardIcon />}>
                  Vai alla pagina risultati
                </Button>
                <Button as="a" href="/home" variant="outline" colorScheme="blue">
                  Torna alla home
                </Button>
              </HStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
      <AppFooter appName="Liner Characteristic App" />
    </Box>
  );
}
