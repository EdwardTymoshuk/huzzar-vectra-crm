import { normalizeAdressForSearch } from '@/utils/orders/normalizeAdressForSearch'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const BUILDING_SPLIT_RE = /[;,]+/

export const normalizeAddressToken = (value: string): string =>
  normalizeAdressForSearch(value).replace(/\s+/g, ' ').trim()

export const parseBuildingFromStreet = (street: string): string | null => {
  const normalized = normalizeAddressToken(street)
  const match = normalized.match(/(\d+[A-Z]?)(?:\/\d+[A-Z]?)?$/)
  return match?.[1] ?? null
}

export const normalizeStreetBaseToken = (street: string): string => {
  const normalized = normalizeAddressToken(street)
  return normalized
    .replace(/\s+\d+[A-Z]?(?:\/\d+[A-Z]?)?\s*$/i, '')
    .trim()
}

export const normalizeBuildingScope = (value?: string | null): string | null => {
  const raw = value?.trim()
  if (!raw) return null

  return raw
    .split(BUILDING_SPLIT_RE)
    .map((part) =>
      part
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/\/\d+[A-Z]?$/i, '')
    )
    .filter(Boolean)
    .join(',')
}

export const resolveBuildingScope = (
  scope: string | null | undefined,
  street: string
): string | null => {
  const normalized = normalizeBuildingScope(scope)
  if (normalized) return normalized
  return parseBuildingFromStreet(street)
}

const tokenMatches = (token: string, building: string): boolean => {
  if (token === '*') return true

  if (!token.includes('-')) {
    return token === building
  }

  const [startRaw, endRaw] = token.split('-', 2)
  const start = Number.parseInt(startRaw, 10)
  const end = Number.parseInt(endRaw, 10)
  const buildingNumeric = Number.parseInt(building, 10)

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    Number.isNaN(buildingNumeric)
  ) {
    return false
  }

  const min = Math.min(start, end)
  const max = Math.max(start, end)
  return buildingNumeric >= min && buildingNumeric <= max
}

export const matchesBuildingScope = (
  scope: string | null | undefined,
  street: string
): boolean => {
  if (!scope) return true

  const building = parseBuildingFromStreet(street)
  if (!building) return true

  const tokens = scope
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean)

  if (tokens.length === 0) return true

  return tokens.some((token) => tokenMatches(token, building))
}

type AddressNoteResult = {
  id: string
  city: string
  street: string
  note: string
  buildingScope: string | null
  createdAt: Date
  createdBy: {
    id: string
    name: string
  }
}

type AddressNoteDbRow = {
  id: string
  city: string
  street: string
  note: string
  buildingScope: string | null
  createdAt: Date
  createdById: string | null
  createdByName: string | null
}

const mapDbRow = (row: AddressNoteDbRow): AddressNoteResult => ({
  id: row.id,
  city: row.city,
  street: row.street,
  note: row.note,
  buildingScope: row.buildingScope,
  createdAt: row.createdAt,
  createdBy: {
    id: row.createdById ?? '',
    name: row.createdByName ?? 'Nieznany użytkownik',
  },
})

export const ensureAddressNotesStorage = async (prisma: PrismaClient) => {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS opl`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS opl."OplAddressNote" (
      "id" TEXT PRIMARY KEY,
      "city" TEXT NOT NULL,
      "street" TEXT NOT NULL,
      "cityNorm" TEXT NOT NULL,
      "streetNorm" TEXT NOT NULL,
      "buildingScope" TEXT,
      "note" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdById" TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OplAddressNote_city_street_active_idx"
    ON opl."OplAddressNote" ("cityNorm", "streetNorm", "active")
  `)
}

export const createAddressNoteRecord = async ({
  prisma,
  city,
  street,
  cityNorm,
  streetNorm,
  buildingScope,
  note,
  createdById,
}: {
  prisma: PrismaClient
  city: string
  street: string
  cityNorm: string
  streetNorm: string
  buildingScope: string | null
  note: string
  createdById: string
}): Promise<AddressNoteResult> => {
  await ensureAddressNotesStorage(prisma)

  const id = randomUUID()
  const now = new Date()

  await prisma.$executeRaw`
    INSERT INTO opl."OplAddressNote"
      ("id","city","street","cityNorm","streetNorm","buildingScope","note","active","createdAt","updatedAt","createdById")
    VALUES
      (${id},${city},${street},${cityNorm},${streetNorm},${buildingScope},${note},true,${now},${now},${createdById})
  `

  const rows = await prisma.$queryRaw<AddressNoteDbRow[]>`
    SELECT
      n."id",
      n."city",
      n."street",
      n."note",
      n."buildingScope",
      n."createdAt",
      u."userId" AS "createdById",
      core."name" AS "createdByName"
    FROM opl."OplAddressNote" n
    LEFT JOIN opl."OplUser" u ON u."userId" = n."createdById"
    LEFT JOIN public."User" core ON core."id" = u."userId"
    WHERE n."id" = ${id}
    LIMIT 1
  `

  const row = rows[0]

  if (!row) {
    throw new Error('Address note insert failed')
  }

  return mapDbRow(row)
}

export const getAddressNotesByAddress = async ({
  prisma,
  cityNorm,
  streetNorm,
  streetNormLegacy,
}: {
  prisma: PrismaClient
  cityNorm: string
  streetNorm: string
  streetNormLegacy?: string
}): Promise<AddressNoteResult[]> => {
  await ensureAddressNotesStorage(prisma)

  const rows = await prisma.$queryRaw<AddressNoteDbRow[]>`
    SELECT
      n."id",
      n."city",
      n."street",
      n."note",
      n."buildingScope",
      n."createdAt",
      u."userId" AS "createdById",
      core."name" AS "createdByName"
    FROM opl."OplAddressNote" n
    LEFT JOIN opl."OplUser" u ON u."userId" = n."createdById"
    LEFT JOIN public."User" core ON core."id" = u."userId"
    WHERE
      n."active" = true
      AND n."cityNorm" = ${cityNorm}
      AND (
        n."streetNorm" = ${streetNorm}
        OR (${streetNormLegacy ?? ''} <> '' AND n."streetNorm" = ${streetNormLegacy ?? ''})
      )
    ORDER BY n."createdAt" DESC
    LIMIT 30
  `

  return rows.map(mapDbRow)
}

export const searchAddressNotesByText = async ({
  prisma,
  query,
  queryNorm,
  limit,
}: {
  prisma: PrismaClient
  query?: string
  queryNorm?: string
  limit: number
}): Promise<AddressNoteResult[]> => {
  await ensureAddressNotesStorage(prisma)

  const hasQuery = Boolean(queryNorm)

  const rows = hasQuery
    ? await prisma.$queryRaw<AddressNoteDbRow[]>`
        SELECT
          n."id",
          n."city",
          n."street",
          n."note",
          n."buildingScope",
          n."createdAt",
          u."userId" AS "createdById",
          core."name" AS "createdByName"
        FROM opl."OplAddressNote" n
        LEFT JOIN opl."OplUser" u ON u."userId" = n."createdById"
        LEFT JOIN public."User" core ON core."id" = u."userId"
        WHERE
          n."active" = true
          AND (
            n."cityNorm" LIKE ${`%${queryNorm}%`}
            OR n."streetNorm" LIKE ${`%${queryNorm}%`}
            OR n."note" ILIKE ${`%${query ?? ''}%`}
          )
        ORDER BY n."createdAt" DESC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<AddressNoteDbRow[]>`
        SELECT
          n."id",
          n."city",
          n."street",
          n."note",
          n."buildingScope",
          n."createdAt",
          u."userId" AS "createdById",
          core."name" AS "createdByName"
        FROM opl."OplAddressNote" n
        LEFT JOIN opl."OplUser" u ON u."userId" = n."createdById"
        LEFT JOIN public."User" core ON core."id" = u."userId"
        WHERE n."active" = true
        ORDER BY n."createdAt" DESC
        LIMIT ${limit}
      `

  return rows.map(mapDbRow)
}
