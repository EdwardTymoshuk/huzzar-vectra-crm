// src/utils/geocode.ts
/*
 * Geocoding utilities for Nominatim with politeness, retries and caching.
 * - Adds User-Agent and Referer headers as required by Nominatim usage policy.
 * - Uses AbortController to enforce a hard timeout per request.
 * - Retries on transient errors and 429s with exponential backoff.
 * - In-memory cache to reduce repeated lookups and external load.
 * - Includes an env toggle to disable geocoding in development if needed.
 */

type LatLng = { lat: number; lng: number }
type FetchJSON = Array<{ lat: string; lon: string }>

/** In-process cache (consider Redis for multi-pod environments). */
const CACHE = new Map<string, LatLng>()
const CACHE_MAX = 2000

/** Request guardrails */
const REQUEST_TIMEOUT_MS = 8000
const MAX_RETRIES = 3

/** Concurrency limiter to avoid bursts against Nominatim */
let inflight = 0
const MAX_CONCURRENCY = 3
const queue: Array<() => void> = []

const acquire = async (): Promise<void> =>
  new Promise((resolve) => {
    if (inflight < MAX_CONCURRENCY) {
      inflight += 1
      resolve()
    } else {
      queue.push(() => {
        inflight += 1
        resolve()
      })
    }
  })

const release = () => {
  inflight = Math.max(0, inflight - 1)
  const next = queue.shift()
  if (next) next()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Normalizes common Polish prefixes in street names. */
export const cleanStreetName = (street: string): string =>
  street.replace(/^(ul\.|al\.|pl\.)\s+/i, '').trim()

/**
 * Removes flat/service-lokal suffixes from street strings for geocoding.
 * Example: "LEMA 4/LU313" -> "LEMA 4"
 */
export const stripStreetUnit = (street: string): string =>
  street
    .replace(/\s+(\d+[A-Z]?)\s*\/\s*[A-Z0-9-]+$/i, ' $1')
    .replace(/\s*\/\s*[A-Z0-9-]+$/i, '')
    .replace(
      /\s*\/\s*(LU|LOK|L|M|M\.|LOKAL)\s*[A-Z0-9-]+$/i,
      ''
    )
    .replace(/\s+(LU|LOK|L|M|M\.|LOKAL)\s*[A-Z0-9-]+$/i, '')
    .replace(/\s+LOKAL\s+[A-Z0-9-]+$/i, '')
    .trim()

/**
 * Geocodes a human-readable address to Lat/Lng using Nominatim.
 * Returns `null` on failure (never throws).
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<LatLng | null> {
  // Optional kill-switch for development / incidents
  if (process.env.GEOCODING_DISABLED === '1') return null

  // Cache hit short-circuit
  const cached = CACHE.get(address)
  if (cached) return cached

  await acquire()
  try {
    let attempt = 0
    while (true) {
      attempt += 1

      // Hard timeout per request
      const ctrl = new AbortController()
      const timeoutId = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pl&limit=1&q=${encodeURIComponent(
          address
        )}`

        const response = await fetch(url, {
          method: 'GET',
          signal: ctrl.signal,
          headers: {
            // Nominatim requires a descriptive UA and recommends contact URL/email
            'User-Agent':
              'HUZZAR-VECTRA-CRM/1.0 (contact: noreply@vectracrm.huzzar.pl)',
            'Accept-Language': 'pl,en;q=0.8',
            Referer: 'https://vectracrm.huzzar.pl',
          },
        })

        clearTimeout(timeoutId)

        // Backoff on 429 / 5xx
        if (response.status === 429 || response.status >= 500) {
          if (attempt <= MAX_RETRIES) {
            const backoff = 400 * Math.pow(2, attempt - 1)
            await sleep(backoff)
            continue
          }
        }

        if (!response.ok) {
          // Non-retriable HTTP errors (4xx except 429)
          return null
        }

        const data = (await response.json()) as FetchJSON
        if (Array.isArray(data) && data.length > 0) {
          const result: LatLng = {
            lat: Number.parseFloat(data[0].lat),
            lng: Number.parseFloat(data[0].lon),
          }
          // Simple LRU-ish: trim oldest when capacity reached
          if (CACHE.size >= CACHE_MAX) {
            const firstKey = CACHE.keys().next().value
            if (firstKey) CACHE.delete(firstKey)
          }
          CACHE.set(address, result)
          return result
        }

        // No results
        return null
      } catch (err) {
        clearTimeout(timeoutId)
        // Retry on network/abort up to MAX_RETRIES
        if (attempt <= MAX_RETRIES) {
          const backoff = 300 * Math.pow(2, attempt - 1)
          await sleep(backoff)
          continue
        }
        // Last-chance: log once and return null (never throw)s
        console.error('Geocoding error (final):', err)
        return null
      }
    }
  } finally {
    release()
  }
}
