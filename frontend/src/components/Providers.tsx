"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError, warmUpServer } from "@/lib/apiClient";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toaster";
import { ServerWakingBanner } from "./ServerWakingBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            // A 401 means "sign in again" and a 404 means "it isn't there" — retrying
            // either just delays the redirect or the error the user needs to see. Genuine
            // transient failures (a waking instance, a blip) are worth one more try.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  // Kick the free-tier instance awake as soon as the app loads, so its ~50s cold start
  // overlaps with the user reading the page rather than with their first click.
  useEffect(() => {
    warmUpServer();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ServerWakingBanner />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
