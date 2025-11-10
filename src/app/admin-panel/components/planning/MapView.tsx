'use client'

/**
 * MapView
 * --------------------------------------------------
 * Displays Leaflet map with colored markers for assigned/unassigned orders.
 * - Standard pin icons (custom color via CSS filter)
 * - Extended popup: order number, address, technician, date, operator
 */

import L, { Map as LeafletMap, TileLayer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

// --- Fix: default marker icons in Next/Webpack builds ---
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Utility: convert module asset to URL string
const toUrl = (m: unknown): string =>
  (m as { src?: string })?.src ?? (m as string)

L.Icon.Default.mergeOptions({
  iconRetinaUrl: toUrl(iconRetina),
  iconUrl: toUrl(iconUrl),
  shadowUrl: toUrl(shadowUrl),
})

type Marker = {
  id: string
  lat: number
  lng: number
  label: string
  date?: string
  operator?: string
  color?: string
}

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

  // Initialize Leaflet map only once
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

  // Render markers whenever data changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous markers (preserve base tile)
    map.eachLayer((layer) => {
      if (layer !== tileRef.current) map.removeLayer(layer)
    })

    // Create and style each marker
    markers.forEach((m) => {
      // Create default icon with optional color filter (for primary/secondary distinction)
      const icon = L.icon({
        iconUrl: toUrl(iconUrl),
        shadowUrl: toUrl(shadowUrl),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        // Use CSS filter to tint marker by color variable
        className: m.color ? `marker-icon-${m.id}` : 'marker-icon-default',
      })

      // Append CSS filter dynamically for custom color
      const markerElement = document.createElement('style')
      markerElement.innerHTML = `
        .marker-icon-${m.id} {
          filter: hue-rotate(${
            m.color === 'var(--primary)' ? '200deg' : '0deg'
          })
                  saturate(1.5);
        }
      `
      document.head.appendChild(markerElement)

      // Build popup HTML
      const popupHtml = `
        <div style="font-size: 13px; line-height: 1.4;">
          <strong>${m.label}</strong><br/>
          ${m.date ? `<b>Data:</b> ${m.date}<br/>` : ''}
          ${m.operator ? `<b>Operator:</b> ${m.operator}<br/>` : ''}
        </div>
      `

      // Add marker to map
      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popupHtml)
    })

    // Auto fit bounds
    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.lat, m.lng] as [number, number])
      )
      map.fitBounds(bounds.pad(0.15), { animate: false })
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false })
    }

    console.debug('[MapView] Rendered markers:', markers.length)
  }, [markers])

  return (
    <div
      key={mapKey}
      ref={containerRef}
      className="w-full h-[60vh] rounded-xl overflow-hidden border z-10"
      aria-label="Mapa zleceń"
    />
  )
}

export default MapView
