import { prisma } from '../prisma'

export const getNextLineOrderNumber = async () => {
  const currentYear = new Date().getFullYear()

  const lastOrder = await prisma.vectraOrder.findFirst({
    where: {
      type: 'OUTAGE',
      orderNumber: {
        startsWith: `HUZ/`,
        endsWith: `/${currentYear}`,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      orderNumber: true,
    },
  })

  const lastNumber = lastOrder?.orderNumber?.split('/')?.[1] ?? '0'

  const nextNumber = parseInt(lastNumber, 10) + 1

  return `HUZ/${nextNumber}/${currentYear}`
}
