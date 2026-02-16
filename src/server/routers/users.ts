import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        oab_number: true,
        avatar_url: true,
        active: true,
      },
    });
    return user;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        oab_number: true,
        avatar_url: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          oab_number: true,
          avatar_url: true,
          active: true,
        },
      });
    }),
});
