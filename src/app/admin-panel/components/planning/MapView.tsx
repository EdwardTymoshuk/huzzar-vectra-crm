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

interface LeafletContainer extends HTMLDivElement {
  _leaflet_id?: number | null
}

const MapView = ({ isVisible }: { isVisible: boolean }) => {
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
    if (!L) return
    const container = L.DomUtil.get(
      'leaflet-map-container'
    ) as LeafletContainer | null
    if (container && container._leaflet_id) container._leaflet_id = null
  }, [L, isVisible])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        mapRef.current?.invalidateSize()
        // enable dragging just in case
        mapRef.current?.dragging?.enable?.()
      }, 0)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="relative w-full"
      style={{ height: '600px', maxHeight: '600px', overflow: 'hidden' }}
    >
      {L && customIcon && (
        <MapContainer
          id="leaflet-map-container"
          center={defaultCenter}
          zoom={9.5}
          style={{ width: '100%', height: '100%' }}
          ref={(instance) => {
            mapRef.current = instance
          }}
          whenReady={() => {
            mapRef.current?.invalidateSize()
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {orders
            .filter((o) => o.lat !== null && o.lng !== null)
            .map((order) => {
              const position: LatLngExpression = [order.lat!, order.lng!]
              const icon = L
                ? getMarkerIcon(order.operator, order.timeSlot, L)
                : undefined
              return (
                <Marker
                  key={order.id}
                  position={position}
                  icon={icon ?? customIcon!}
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
      )}
    </div>
  )
}

export default MapView
