'use client'

import { timeSlotMap } from '@/lib/constants'
import getMarkerIcon from '@/utils/getMarkerIcon'
import { trpc } from '@/utils/trpc'
import { DivIcon, LatLngExpression, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

/**
 * Extends the native HTMLDivElement to allow modifying the `_leaflet_id`.
 */
interface LeafletContainer extends HTMLDivElement {
  _leaflet_id?: number | null
}

/**
 * Displays a Leaflet map with markers for unassigned orders.
 * The map is rendered only if `isVisible` is true.
 */
const MapView = ({ isVisible }: { isVisible: boolean }) => {
  // Fetch unassigned orders using tRPC
  const { data: orders = [] } = trpc.order.getUnassignedOrders.useQuery()

  // Store the imported Leaflet library and custom icon
  const [L, setL] = useState<typeof import('leaflet') | null>(null)
  const [customIcon, setCustomIcon] = useState<DivIcon | null>(null)

  // Unique key to force re-initialization if needed
  const [mapKey] = useState(
    () => 'map-' + Math.random().toString(36).substr(2, 9)
  )

  // Reference to the LeafletMap instance (from react-leaflet)
  const mapRef = useRef<LeafletMap | null>(null)

  // Default center for the map
  const defaultCenter: LatLngExpression = [54.3717, 18.608]

  /**
   * Dynamically import Leaflet to avoid SSR issues,
   * then create a custom DivIcon based on FaMapMarkerAlt.
   */
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet)
      setCustomIcon(
        new leaflet.DivIcon({
          html: renderToString(
            <FaMapMarkerAlt size={30} className="text-danger" />
          ),
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        })
      )
    })
  }, [])

  /**
   * Whenever Leaflet or visibility changes, reset the internal
   * Leaflet container ID so that MapContainer won't conflict
   * with previous instances.
   */
  useEffect(() => {
    if (!L) return
    const container = L.DomUtil.get(
      'leaflet-map-container'
    ) as LeafletContainer | null
    if (container && container._leaflet_id) {
      container._leaflet_id = null
    }
  }, [L, isVisible])

  /**
   * Cleanup: remove the Leaflet map instance when the component unmounts.
   * We copy the current map reference into a local variable to avoid
   * potential changes in `mapRef.current` at cleanup time.
   */
  useEffect(() => {
    const currentMap = mapRef.current
    return () => {
      currentMap?.remove()
    }
  }, [])

  /**
   * Invalidate map size after it becomes visible,
   * so the tile layer is rendered correctly.
   */
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 200)
    }
  }, [isVisible])

  /**
   * Enable map dragging when the component is visible.
   */
  useEffect(() => {
    if (isVisible && mapRef.current && mapRef.current.dragging) {
      mapRef.current.dragging.enable()
    }
  }, [isVisible])

  // If the map is not visible, do not render anything.
  if (!isVisible) {
    return null
  }

  return (
    <div
      className="relative w-full"
      style={{ height: '600px', maxHeight: '600px', overflow: 'hidden' }}
    >
      {L && customIcon && (
        <MapContainer
          id="leaflet-map-container"
          key={mapKey}
          dragging={true}
          center={defaultCenter}
          zoom={9.5}
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {orders
            .filter((order) => order.lat !== null && order.lng !== null)
            .map((order) => {
              const position: LatLngExpression = [order.lat!, order.lng!]
              const icon = L
                ? getMarkerIcon(order.operator, order.timeSlot, L)
                : undefined

              return (
                <Marker key={order.id} position={position} icon={icon}>
                  <Popup>
                    <strong>{order.orderNumber}</strong>
                    <br />
                    {order.city}, {order.street}
                    <br />
                    {timeSlotMap[order.timeSlot]}
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      )}
    </div>
  )
}

export default MapView
