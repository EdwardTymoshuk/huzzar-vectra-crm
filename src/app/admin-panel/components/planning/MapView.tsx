'use client'

import { timeSlotMap } from '@/lib/constants'
import getMarkerIcon from '@/utils/getMarkerIcon'
import { trpc } from '@/utils/trpc'
import type { DivIcon, LatLngExpression, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

type Props = { mapKey: string }

const MapView = ({ mapKey }: Props) => {
  const { data: orders = [] } = trpc.order.getUnassignedOrders.useQuery()

  const [L, setL] = useState<typeof import('leaflet') | null>(null)
  const [customIcon, setCustomIcon] = useState<DivIcon | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  const defaultCenter: LatLngExpression = [54.3717, 18.608]

  useEffect(() => {
    let mounted = true
    import('leaflet').then((leaflet) => {
      if (!mounted) return
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
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      // pełne sprzątanie instancji
      if (mapRef.current) {
        mapRef.current.off()
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  if (!L || !customIcon) {
    return (
      <div
        className="relative w-full"
        style={{ height: '600px', maxHeight: '600px', overflow: 'hidden' }}
      />
    )
  }

  return (
    <div
      className="relative w-full"
      style={{ height: '600px', maxHeight: '600px', overflow: 'hidden' }}
    >
      <MapContainer
        key={mapKey} // wymusza świeży kontener
        center={defaultCenter}
        zoom={9.5}
        style={{ width: '100%', height: '100%' }}
        ref={(instance) => {
          mapRef.current = instance
        }}
        whenReady={() => {
          // po pierwszym renderze
          mapRef.current?.invalidateSize()
          mapRef.current?.dragging?.enable?.()
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {orders
          .filter((o) => o.lat !== null && o.lng !== null)
          .map((order) => {
            const position: LatLngExpression = [order.lat!, order.lng!]
            const icon = getMarkerIcon(order.operator, order.timeSlot, L)
            return (
              <Marker
                key={order.id}
                position={position}
                icon={icon ?? customIcon}
              >
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
    </div>
  )
}

export default MapView
