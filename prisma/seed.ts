import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.module.createMany({
    data: [
      { name: 'Vectra CRM', code: 'VECTRA' },
      { name: 'OPL CRM', code: 'OPL' },
      { name: 'HR', code: 'HR' },
    ],
    skipDuplicates: true,
  })

  console.log('Modules seeded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
