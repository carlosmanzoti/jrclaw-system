import { router } from "@/server/trpc";
import { usersRouter } from "./users";
import { casesRouter } from "./cases";
import { projectsRouter } from "./projects";
import { personsRouter } from "./persons";

export const appRouter = router({
  users: usersRouter,
  cases: casesRouter,
  projects: projectsRouter,
  persons: personsRouter,
});

export type AppRouter = typeof appRouter;
