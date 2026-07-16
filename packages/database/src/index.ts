import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { atlasPrisma?: PrismaClient };
export const prisma = globalForPrisma.atlasPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.atlasPrisma = prisma;
export { Prisma, PrismaClient } from '@prisma/client';
export type * from '@prisma/client';
