import { publicProcedure, router } from "../trpc"

export const exampleRouter = router({
  // Simple query returning a static string response
  hello: publicProcedure.query(() => {
    return "Hello, world!";
  }),
});
