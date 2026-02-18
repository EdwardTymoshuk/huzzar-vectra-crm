import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SERVICE_RATES = [
  { code: 'N-FTTH', amount: 42 },
  { code: 'N-ZA', amount: 30 },
  { code: 'NP-FTTH', amount: 90 },
  { code: 'OZA', amount: 13 },
  { code: 'SPLIT32', amount: 85 },
  { code: 'SPLIT64', amount: 127 },
  { code: 'PKU1', amount: 25 },
  { code: 'PKU2', amount: 4 },
  { code: 'PKU3', amount: 1 },
]

const normalize = (code) => code.trim().toUpperCase()

async function main() {
  let created = 0
  let existing = 0

  for (const rate of SERVICE_RATES) {
    const code = normalize(rate.code)

    const found = await prisma.oplRateDefinition.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })

    if (found) {
      existing += 1
      continue
    }

    await prisma.oplRateDefinition.create({
      data: {
        code,
        amount: rate.amount,
      },
    })

    created += 1
  }

  console.log('Seeded OPL service rates')
  console.log({ created, existing, total: SERVICE_RATES.length })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
