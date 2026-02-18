import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log warnings and errors — "query" logging is extremely slow in dev
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: {
      maxWait: 10000,   // Max time to acquire a connection from the pool (ms)
      timeout: 30000,   // Max time for the entire transaction (ms)
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
