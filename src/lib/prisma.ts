import { PrismaClient } from "@/generated/prisma";
import { serverEnv } from "@/env/server";

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      serverEnv.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
