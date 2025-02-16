import { router } from "../trpc"
import { exampleRouter } from "./example"

// Combine all sub-routers into a single API router
export const appRouter = router({
  example: exampleRouter,
});

// Export the API router type for client-side usage
export type AppRouter = typeof appRouter;
