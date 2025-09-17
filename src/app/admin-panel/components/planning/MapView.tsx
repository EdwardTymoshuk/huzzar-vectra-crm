'use client'

/**
 * MapView
 * - Safe Leaflet init + cleanup (prevents "already initialized").
 * - Fixes default marker icons path in Next.js bundling.
 * - Renders markers passed via props.
 */

import L, { Map as LeafletMap, TileLayer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

// --- Fix: default marker icons in Next/Webpack builds ---
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Ensure correct URLs no matter how bundler represents assets
const toUrl = (m: unknown): string =>
  (m as { src?: string })?.src ?? (m as string)

L.Icon.Default.mergeOptions({
  iconRetinaUrl: toUrl(iconRetina),
  iconUrl: toUrl(iconUrl),
  shadowUrl: toUrl(shadowUrl),
})

type Marker = { id: string; lat: number; lng: number; label?: string }

type Props = {
  mapKey: string
  markers?: Marker[]
}

const DEFAULT_CENTER: [number, number] = [54.352, 18.646] // Gdańsk
const DEFAULT_ZOOM = 11

const MapView: React.FC<Props> = ({ mapKey, markers = [] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const tileRef = useRef<TileLayer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    })
    mapRef.current = map

    const tile = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
      }
    )
    tile.addTo(map)
    tileRef.current = tile

    return () => {
      if (mapRef.current) {
        mapRef.current.off()
        mapRef.current.remove()
        mapRef.current = null
      }
      tileRef.current = null
    }
  }, [mapKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous overlays (keep base tile)
    map.eachLayer((layer) => {
      if (layer !== tileRef.current) map.removeLayer(layer)
    })

    // Add markers
    markers.forEach((m) => {
      L.marker([m.lat, m.lng])
        .addTo(map)
        .bindPopup(m.label ?? m.id)
    })

    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.lat, m.lng] as [number, number])
      )
      map.fitBounds(bounds.pad(0.15), { animate: false })
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false })
    }

    // Simple console debug
    console.debug('[MapView] markers:', markers.length)
  }, [markers])

  return (
    <div
      key={mapKey}
      ref={containerRef}
      className="w-full h-[60vh] rounded-xl overflow-hidden border"
      aria-label="Mapa nieprzypisanych zleceń"
    />
  )
}

export default MapView
