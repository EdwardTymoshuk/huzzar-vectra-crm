import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Missing/default OPL rates requested by business.
 * If rate exists with amount > 0 we keep it.
 * If missing or amount <= 0, we set default amount.
 */
const MISSING_RATE_DEFAULTS = [
  // Installation / base / addons
  { code: 'WGH', amount: 116 },
  { code: 'ZJD', amount: 212 },
  { code: 'ZJDD', amount: 51 },
  { code: 'ZJKD', amount: 8 },
  { code: 'ZJND', amount: 21 },
  { code: 'P1P', amount: 33 },
  { code: 'DAFP', amount: 85 },
  { code: 'ZJN', amount: 15 },
  { code: 'MR', amount: 9 },
  { code: 'OZA', amount: 13 },

  // PKI mapping requested
  { code: 'PKI1', amount: 1 }, // Światło >50m
  { code: 'PKI2', amount: 2 }, // Koryta >50m
  { code: 'PKI4', amount: 7 }, // Przewiert
  { code: 'PKI5', amount: 2 }, // Dukty
  { code: 'PKI6', amount: 25 }, // Budowa Pionu
  { code: 'PKI7', amount: 17 }, // HILTI
  { code: 'PKI13', amount: 4 }, // Przelot
  { code: 'PKI15', amount: 79 }, // Rozbiórka / odtworzenie twardej nawierzchni
  { code: 'PKI16', amount: 1 }, // Światło W4
  { code: 'PKI17', amount: 125 }, // Zgody Galerie
  { code: 'PKI22', amount: 3 }, // Przewiert MR
  { code: 'PKI23', amount: 1 }, // UTP MR
  { code: 'PKI26', amount: 21 }, // Wprowadzenie OPP
  { code: 'PKI27', amount: 12 }, // Spawanie OPP
]

const normalize = (code) => code.trim().toUpperCase()

async function main() {
  let created = 0
  let updated = 0
  let kept = 0

  for (const item of MISSING_RATE_DEFAULTS) {
    const code = normalize(item.code)
    const existing = await prisma.oplRateDefinition.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
      select: { id: true, amount: true },
    })

    if (!existing) {
      await prisma.oplRateDefinition.create({
        data: {
          code,
          amount: item.amount,
        },
      })
      created += 1
      continue
    }

    if ((existing.amount ?? 0) <= 0) {
      await prisma.oplRateDefinition.update({
        where: { id: existing.id },
        data: { amount: item.amount },
      })
      updated += 1
      continue
    }

    kept += 1
  }

  console.log('Ensured missing/default OPL rates')
  console.log({
    created,
    updatedZeroOrInvalid: updated,
    keptExisting: kept,
    total: MISSING_RATE_DEFAULTS.length,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
