import { router } from "@/server/trpc";
import { usersRouter } from "./users";
import { casesRouter } from "./cases";
import { projectsRouter } from "./projects";
import { personsRouter } from "./persons";
import { deadlinesRouter } from "./deadlines";
import { calendarRouter } from "./calendar";
import { activitiesRouter } from "./activities";
import { documentsRouter } from "./documents";
import { reportsRouter } from "./reports";
import { confeccaoRouter } from "./confeccao";
import { bibliotecaRouter } from "./biblioteca";

export const appRouter = router({
  users: usersRouter,
  cases: casesRouter,
  projects: projectsRouter,
  persons: personsRouter,
  deadlines: deadlinesRouter,
  calendar: calendarRouter,
  activities: activitiesRouter,
  documents: documentsRouter,
  reports: reportsRouter,
  confeccao: confeccaoRouter,
  biblioteca: bibliotecaRouter,
});

export type AppRouter = typeof appRouter;
