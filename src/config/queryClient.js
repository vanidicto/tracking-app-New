// src/config/queryClient.js
// Global TanStack Query client with caching defaults
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data stays fresh for 5 minutes — navigating between pages
      // serves cached data instantly without triggering a new fetch
      staleTime: 5 * 60 * 1000,

      // Disable refetch on window focus since we use real-time Firestore
      // listeners to push updates (not polling)
      refetchOnWindowFocus: false,

      // Only retry failed queries once
      retry: 1,
    },
  },
});
