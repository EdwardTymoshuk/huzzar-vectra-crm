import { Prisma } from '@prisma/client'

export const coreUserBasicSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
})
