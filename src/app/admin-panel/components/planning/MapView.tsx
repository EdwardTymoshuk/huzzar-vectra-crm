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

const MapView = ({ isVisible }: { isVisible: boolean }) => {
  const { data: orders = [] } = trpc.order.getUnassignedOrders.useQuery()

  // Typujemy L jako obiekt Leaflet (lub null)
  const [L, setL] = useState<typeof import('leaflet') | null>(null)
  // Zadeklaruj customIcon jako DivIcon | null
  const [customIcon, setCustomIcon] = useState<DivIcon | null>(null)
  const [mapKey] = useState(
    () => 'map-' + Math.random().toString(36).substr(2, 9)
  )
  const mapRef = useRef<LeafletMap | null>(null)
  const defaultCenter: LatLngExpression = [54.3717, 18.608]

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

  useEffect(() => {
    if (L) {
      const container = L.DomUtil.get('leaflet-map-container')
      if (container && (container as any)._leaflet_id) {
        ;(container as any)._leaflet_id = null
      }
    }
  }, [L, isVisible])

  if (!isVisible) return null

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (isVisible && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 200)
    }
  }, [isVisible])

  useEffect(() => {
    if (mapRef.current && mapRef.current.dragging) {
      mapRef.current.dragging.enable()
    }
  }, [isVisible])

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
