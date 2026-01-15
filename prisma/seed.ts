// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function seedModules() {
//   const modules = [
//     {
//       name: 'Vectra CRM',
//       code: 'VECTRA',
//     },
//     {
//       name: 'Orange CRM',
//       code: 'ORANGE',
//     },
//     {
//       name: 'Kadry',
//       code: 'HR',
//     },
//     {
//       name: 'Flota',
//       code: 'FLEET',
//     },
//     {
//       name: 'Magazyn narzędzi',
//       code: 'WAREHOUSE',
//     },
//   ]

//   for (const module of modules) {
//     await prisma.module.upsert({
//       where: { code: module.code },
//       update: {},
//       create: module,
//     })
//   }
// }

// seedModules()
//   .then(() => {
//     console.log('✅ Modules seeded')
//   })
//   .finally(() => prisma.$disconnect())
