// src/utils/prisma.ts
import { PrismaClient } from '@prisma/client'

// Global declaration for Prisma instance (only in development mode)
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
