// src/server/core/helpers/users/syncModuleUsers.ts
import { syncOplUser } from '@/app/(modules)/opl-crm/utils/users/syncOplUser'
import { syncVectraUser } from '@/app/(modules)/vectra-crm/utils/users/syncVectraUser'
import { Prisma } from '@prisma/client'

export async function syncModuleUsers(
  tx: Prisma.TransactionClient,
  userId: string,
  prevModuleCodes: string[],
  nextModuleCodes: string[]
) {
  const added = nextModuleCodes.filter((m) => !prevModuleCodes.includes(m))
  const removed = prevModuleCodes.filter((m) => !nextModuleCodes.includes(m))

  if (added.includes('VECTRA')) {
    await syncVectraUser(tx, userId, true)
  }

  if (removed.includes('VECTRA')) {
    await syncVectraUser(tx, userId, false)
  }

  if (added.includes('OPL')) {
    await syncOplUser(tx, userId, true)
  }

  if (removed.includes('OPL')) {
    await syncOplUser(tx, userId, false)
  }
}
