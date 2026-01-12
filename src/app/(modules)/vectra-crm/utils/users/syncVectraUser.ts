import { Prisma } from '@prisma/client'

/**
 * Synchronizes VectraUser state with core user's module assignment.
 * Handles creation, activation and deactivation without removing history.
 */
export const syncVectraUser = async (
  prisma: Prisma.TransactionClient,
  userId: string,
  hasVectraModule: boolean
): Promise<void> => {
  const vectraUser = await prisma.vectraUser.findUnique({
    where: { userId },
  })

  // CASE 1: VECTRA assigned and no VectraUser yet → CREATE
  if (hasVectraModule && !vectraUser) {
    await prisma.vectraUser.create({
      data: {
        userId,
        active: true,
      },
    })
    return
  }

  // CASE 2: VECTRA assigned and user was inactive → REACTIVATE
  if (hasVectraModule && vectraUser && !vectraUser.active) {
    await prisma.vectraUser.update({
      where: { userId },
      data: {
        active: true,
        deactivatedAt: null,
      },
    })
    return
  }

  // CASE 3: VECTRA removed and user is active → DEACTIVATE
  if (!hasVectraModule && vectraUser?.active) {
    await prisma.vectraUser.update({
      where: { userId },
      data: {
        active: false,
        deactivatedAt: new Date(),
      },
    })
  }
}
