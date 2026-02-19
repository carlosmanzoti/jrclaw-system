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
import { rjRouter } from "./rj";
import { importRouter } from "./import";
import { stratNegRouter } from "./strat-neg";
import { recoveryRouter } from "./recovery";
import { emailActivityRouter } from "./email-activity";
import { whatsappRouter } from "./whatsapp";
import { crjNegotiationsRouter } from "./crj-negotiations";
import { monitoringRouter } from "./monitoring";
import { financialRouter } from "./financial";
import { auditRouter } from "./audit";
import { investigationRouter } from "./investigation";

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
  rj: rjRouter,
  import: importRouter,
  stratNeg: stratNegRouter,
  recovery: recoveryRouter,
  emailActivity: emailActivityRouter,
  whatsapp: whatsappRouter,
  crjNeg: crjNegotiationsRouter,
  monitoring: monitoringRouter,
  financial: financialRouter,
  audit: auditRouter,
  investigation: investigationRouter,
});

export type AppRouter = typeof appRouter;
