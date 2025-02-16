import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "./routers"

// Universal handler for both GET and POST requests
export const GET = (req: Request) => fetchRequestHandler({
  endpoint: "/api/trpc",
  req,
  router: appRouter,
  createContext: () => ({}),
});

export const POST = GET;
