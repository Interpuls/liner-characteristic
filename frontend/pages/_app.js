import { ChakraProvider, Box, Spinner } from "@chakra-ui/react";
import Router from "next/router";
import { useEffect, useState } from "react";

export default function MyApp({ Component, pageProps }) {
  const [routeLoading, setRouteLoading] = useState(false);
  useEffect(() => {
    let timer = null;
    const start = () => {
      // show overlay only if loading takes >150ms
      timer = setTimeout(() => setRouteLoading(true), 150);
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      setRouteLoading(false);
    };
    Router.events.on("routeChangeStart", start);
    Router.events.on("routeChangeComplete", stop);
    Router.events.on("routeChangeError", stop);
    return () => {
      Router.events.off("routeChangeStart", start);
      Router.events.off("routeChangeComplete", stop);
      Router.events.off("routeChangeError", stop);
    };
  }, []);

  return (
    <ChakraProvider>
      {routeLoading && (
        <Box position="fixed" inset={0} bg="whiteAlpha.800" zIndex={9999}
             display="flex" alignItems="center" justifyContent="center">
          <Spinner size="xl" thickness="4px" color="blue.500" />
        </Box>
      )}
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
