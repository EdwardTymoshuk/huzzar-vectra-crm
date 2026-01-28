// src/app/(modules)/opl-crm/utils/users/syncOplUser.ts
import { Prisma } from '@prisma/client'

export async function syncOplUser(
  tx: Prisma.TransactionClient,
  userId: string,
  shouldBeActive: boolean
) {
  if (shouldBeActive) {
    await tx.oplUser.upsert({
      where: { userId },
      update: {
        active: true,
        deactivatedAt: null,
      },
      create: {
        userId,
        active: true,
      },
    })
  } else {
    await tx.oplUser.updateMany({
      where: { userId },
      data: {
        active: false,
        deactivatedAt: new Date(),
      },
    })
  }
}
