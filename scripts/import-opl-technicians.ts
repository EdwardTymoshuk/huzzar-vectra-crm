import bcrypt from 'bcrypt'
import { PrismaClient, Role, UserStatus } from '@prisma/client'

type ImportTechnician = {
  firstName: string
  lastName: string
  idpt?: number
  phoneNumber?: string
  email?: string
}

const DEFAULT_PHONE = '000000000'
const DEFAULT_EMAIL_DOMAIN = 'huzzar.com.pl'

const RAW_TECHNICIANS: ImportTechnician[] = [
  { firstName: 'Kamil', lastName: 'Walerzak', idpt: 575545 },
  { firstName: 'Łukasz', lastName: 'Kanabaja', idpt: 578236 },
  { firstName: 'Dawid', lastName: 'Oszast' },
  { firstName: 'Wojciech', lastName: 'Ścibior' },
  { firstName: 'Ivan', lastName: 'Tomniak' },
  { firstName: 'Rafał', lastName: 'Kujawski', idpt: 572207 },
  { firstName: 'Oleg', lastName: 'Vorobkalov', idpt: 580213 },
  { firstName: 'Bartek', lastName: 'Światkowski', idpt: 574389 },
  { firstName: 'Wojciech', lastName: 'Kawiecki', idpt: 576055 },
  { firstName: 'Wojciech', lastName: 'Wiśniewski', idpt: 574411 },
  { firstName: 'Andrii', lastName: 'Nevkrytyi', idpt: 579212 },
  { firstName: 'Bartek', lastName: 'Bochen', idpt: 574390 },
  { firstName: 'Łukasz', lastName: 'Czerwiński', idpt: 578690 },
  { firstName: 'Artem', lastName: 'Sokolov', idpt: 577348 },
  { firstName: 'Konrad', lastName: 'Chiliński', idpt: 576099 },
  { firstName: 'Kacper', lastName: 'Wejer', idpt: 574793 },
  { firstName: 'Marcin', lastName: 'Keller', idpt: 576100 },
  { firstName: 'Michał', lastName: 'Bochen', idpt: 572459 },
  { firstName: 'Kamil', lastName: 'Stawiarski', idpt: 575591 },
  { firstName: 'Piotr', lastName: 'Mielewczyk' },
  { firstName: 'Kamil', lastName: 'Serowiński', idpt: 576858 },
  { firstName: 'Tomasz', lastName: 'Gołębiewski', idpt: 575008 },
  { firstName: 'Jakub', lastName: 'Mokrzecki', idpt: 567256 },
  { firstName: 'Michał', lastName: 'Łapiński', idpt: 579202 },
  { firstName: 'Łukasz', lastName: 'Piotrowski', idpt: 579141 },
  { firstName: 'Przemysław', lastName: 'Domarus', idpt: 576532 },
  { firstName: 'Marcin', lastName: 'Pagór', idpt: 574503 },
  { firstName: 'Aleksander', lastName: 'Powierza', idpt: 574422 },
  { firstName: 'Paweł', lastName: 'Chmielewski', idpt: 578347 },
  { firstName: 'Kacper', lastName: 'Toczyński', idpt: 576531 },
  { firstName: 'Dominik', lastName: 'Wądołowski', idpt: 574786 },
  { firstName: 'Bartłomiej', lastName: 'Nuckowski', idpt: 575366 },
  { firstName: 'Jędrzej', lastName: 'Bochen', idpt: 574093 },
  { firstName: 'Eduard', lastName: 'Tymoshuk', idpt: 571439 },
  { firstName: 'Adam', lastName: 'Wachler' },
  { firstName: 'Artur', lastName: 'Grabowski' },
]

type ContactOverride = {
  phoneNumber?: string
  email?: string
}

const CONTACT_OVERRIDES_BY_IDPT: Record<number, ContactOverride> = {
  571439: { phoneNumber: '518555322', email: 'e.tymoshuk@huzzar.com.pl' },
  572207: { phoneNumber: '510435290', email: 'r.kujawski@huzzar.com.pl' },
  572459: { phoneNumber: '88484140', email: 'm.bochen@huzzar.com.pl' },
  574093: { phoneNumber: '666836884', email: 'j.bochen@huzzar.com.pl' },
  574390: { phoneNumber: '692471197', email: 'b.bochen@huzzar.com.pl' },
  574786: { phoneNumber: '516856470', email: 'd.wadolowski@huzzar.com.pl' },
  575008: { phoneNumber: '693210941', email: 't.golebiewski@huzzar.com.pl' },
  575366: { phoneNumber: '726069605', email: 'b.nuckowski@huzzar.com.pl' },
  575545: { phoneNumber: '505409209', email: 'k.walerzak@huzzar.com.pl' },
  576055: { phoneNumber: '798759469', email: 'w.kawiecki@huzzar.com.pl' },
  576532: {
    phoneNumber: '517129322',
    email: 'p.domarus@fotonservice.pl',
  },
  576858: { phoneNumber: '535275579', email: 'k.serowinski@huzzar.com.pl' },
  577348: { phoneNumber: '884848755', email: 'a.sokolov@huzzar.com.pl' },
  578236: { phoneNumber: '504786055', email: 'l.kanabaja@huzzar.com.pl' },
  578690: { phoneNumber: '790467875', email: 'l.czerwinski@huzzar.com.pl' },
  579141: { phoneNumber: '508418488', email: 'l.piotrowski@fotonservice.pl' },
  579202: { phoneNumber: '665084580', email: 'm.lapinski@huzzar.com.pl' },
  579212: { phoneNumber: '793371901', email: 'a.nevkrytyi@huzzar.com.pl' },
}

const CONTACT_OVERRIDES_BY_NAME: Record<string, ContactOverride> = {
  'adam wachler': { phoneNumber: '731194788', email: 'a.wachler@huzzar.com.pl' },
  'piotr mielewczyk': {
    phoneNumber: '723722004',
    email: 'p.mielewczyk@huzzar.com.pl',
  },
  'kamil stawiarski': {
    phoneNumber: '530943771',
    email: 'k.stawiarski@huzzar.com.pl',
  },
  'kacper wejer': { phoneNumber: '884848069', email: 'k.wejer@fotonservice.pl' },
  'aleksander powierza': {
    phoneNumber: '884848749',
    email: 'a.powierza@fotonservice.pl',
  },
  'jakub mokrzecki': {
    phoneNumber: '888293944',
    email: 'j.mokrzecki@huzzar.com.pl',
  },
}

const normalizeForEmail = (value: string): string => {
  const map: Record<string, string> = {
    ą: 'a',
    ć: 'c',
    ę: 'e',
    ł: 'l',
    ń: 'n',
    ó: 'o',
    ś: 's',
    ż: 'z',
    ź: 'z',
    Ą: 'a',
    Ć: 'c',
    Ę: 'e',
    Ł: 'l',
    Ń: 'n',
    Ó: 'o',
    Ś: 's',
    Ż: 'z',
    Ź: 'z',
  }

  return value
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const buildEmail = (firstName: string, lastName: string): string => {
  const firstInitial = normalizeForEmail(firstName).charAt(0)
  const lastPart = normalizeForEmail(lastName)
  return `${firstInitial}.${lastPart}@${DEFAULT_EMAIL_DOMAIN}`
}

const deduplicate = (rows: ImportTechnician[]): ImportTechnician[] => {
  const seen = new Set<string>()
  const out: ImportTechnician[] = []

  for (const row of rows) {
    const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

const getOverride = (t: ImportTechnician): ContactOverride | null => {
  if (t.idpt && CONTACT_OVERRIDES_BY_IDPT[t.idpt]) {
    return CONTACT_OVERRIDES_BY_IDPT[t.idpt]
  }
  const key = `${t.firstName.toLowerCase()} ${t.lastName.toLowerCase()}`
  return CONTACT_OVERRIDES_BY_NAME[key] ?? null
}

async function main() {
  const prisma = new PrismaClient()
  const dryRun = process.env.IMPORT_DRY_RUN !== 'false'
  const tempPassword = process.env.IMPORT_TEMP_PASSWORD

  if (!dryRun && (!tempPassword || tempPassword.length < 8)) {
    throw new Error(
      'Ustaw IMPORT_TEMP_PASSWORD (min. 8 znaków) albo uruchom z IMPORT_DRY_RUN=true.'
    )
  }

  const technicians = deduplicate(RAW_TECHNICIANS).map((t) => ({
    ...t,
    email:
      getOverride(t)?.email ?? t.email ?? buildEmail(t.firstName, t.lastName),
    phoneNumber: getOverride(t)?.phoneNumber ?? t.phoneNumber ?? DEFAULT_PHONE,
  }))

  const oplModule = await prisma.module.findUnique({
    where: { code: 'OPL' },
    select: { id: true },
  })

  if (!oplModule) {
    throw new Error('Nie znaleziono modułu OPL (module.code = OPL).')
  }

  const locations = await prisma.location.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  if (locations.length === 0) {
    throw new Error('Brak lokalizacji w systemie.')
  }

  const passwordHash = dryRun
    ? ''
    : await bcrypt.hash(tempPassword as string, 10)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const tech of technicians) {
    const fullName = `${tech.firstName} ${tech.lastName}`
    const email = tech.email as string
    const idpt = tech.idpt ?? null

    const existing =
      (await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      })) ||
      (idpt
        ? await prisma.user.findUnique({
            where: { identyficator: idpt },
            select: { id: true, email: true },
          })
        : null)

    if (!existing && dryRun) {
      created++
      console.log(`[DRY-RUN][CREATE] ${fullName} | ${email} | IDPT=${idpt ?? '-'}`)
      continue
    }

    if (existing && dryRun) {
      updated++
      console.log(`[DRY-RUN][UPDATE] ${fullName} | ${email} | IDPT=${idpt ?? '-'}`)
      continue
    }

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          name: fullName,
          email,
          phoneNumber: tech.phoneNumber as string,
          password: passwordHash,
          role: Role.TECHNICIAN,
          status: UserStatus.ACTIVE,
          identyficator: idpt,
          modules: {
            create: [{ moduleId: oplModule.id }],
          },
          locations: {
            create: locations.map((loc) => ({ locationId: loc.id })),
          },
        },
        select: { id: true },
      })

      await prisma.oplUser.upsert({
        where: { userId: user.id },
        update: { active: true, deactivatedAt: null },
        create: { userId: user.id, active: true },
      })

      created++
      console.log(`[CREATE] ${fullName} | ${email}`)
      continue
    }

    const userId = existing.id

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        phoneNumber: tech.phoneNumber as string,
        role: Role.TECHNICIAN,
        status: UserStatus.ACTIVE,
        identyficator: idpt,
      },
    })

    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId: oplModule.id } },
      update: {},
      create: { userId, moduleId: oplModule.id },
    })

    for (const loc of locations) {
      await prisma.userLocation.upsert({
        where: { userId_locationId: { userId, locationId: loc.id } },
        update: {},
        create: { userId, locationId: loc.id },
      })
    }

    await prisma.oplUser.upsert({
      where: { userId },
      update: { active: true, deactivatedAt: null },
      create: { userId, active: true },
    })

    updated++
    console.log(`[UPDATE] ${fullName} | ${email}`)
  }

  console.log('\n=== IMPORT SUMMARY ===')
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}`)
  console.log(`Created: ${created}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
