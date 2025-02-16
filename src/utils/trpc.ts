import type { AppRouter } from "@/server/routers"
import { httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import superjson from "superjson"

// Create a tRPC React instance for the client
export const trpc = createTRPCReact<AppRouter>();

// Define tRPC client options
export const trpcClientOptions = {
  links: [
    httpBatchLink({
      url: "/api/trpc", // API route for tRPC requests
    }),
  ],
  transformer: superjson, // Enable serialization
};
