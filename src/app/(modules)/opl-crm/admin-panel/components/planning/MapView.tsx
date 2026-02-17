'use client'

/**
 * MapView
 * --------------------------------------------------
 * Displays Leaflet map with fully colorized SVG markers.
 * - No PNG icons (Leaflet defaults removed)
 * - Each marker uses an inline SVG with dynamic fill color
 */

import L, { Map as LeafletMap, TileLayer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

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

const DEFAULT_CENTER: [number, number] = [54.352, 18.646]
const DEFAULT_ZOOM = 11

/** Helper: create a dynamic SVG marker icon */
function createColorIcon(color: string = '#3b82f6') {
  const svg = `
    <svg width="16" height="24" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41C12.5 41 25 22 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="5.5" fill="white"/>
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [16, 24],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  })
}

const MapView: React.FC<Props> = ({ mapKey, markers = [] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const tileRef = useRef<TileLayer | null>(null)

  // Initialize map once
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
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }
    )
    tile.addTo(map)
    tileRef.current = tile

    return () => {
      map.off()
      map.remove()
      mapRef.current = null
      tileRef.current = null
    }
  }, [mapKey])

  // Render markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing non-tile layers
    map.eachLayer((layer) => {
      if (layer !== tileRef.current) map.removeLayer(layer)
    })

    markers.forEach((m) => {
      const icon = createColorIcon(m.color)

      const popupHtml = `
        <div style="font-size: 13px; line-height: 1.4;">
          <strong>${m.label}</strong><br/>
          ${m.date ? `<b>Data:</b> ${m.date}<br/>` : ''}
          <b>Operator:</b> ${m.operator || '-'}<br/>
        </div>
      `

      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popupHtml)
    })

    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.lat, m.lng] as [number, number])
      )
      map.fitBounds(bounds.pad(0.15), { animate: false })
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false })
    }
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
