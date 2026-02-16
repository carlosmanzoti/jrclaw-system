import { router } from "@/server/trpc";
import { usersRouter } from "./users";
import { casesRouter } from "./cases";
import { projectsRouter } from "./projects";

export const appRouter = router({
  users: usersRouter,
  cases: casesRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;
