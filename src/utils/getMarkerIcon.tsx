import { timeSlotColors } from '@/lib/constants'
import { DivIcon } from 'leaflet'
import { renderToString } from 'react-dom/server'
import { FaMapMarkerAlt } from 'react-icons/fa'

const getMarkerIcon = (
  operator: string,
  timeSlot: string,
  leaflet: typeof import('leaflet')
): DivIcon => {
  const markerColor = timeSlotColors[operator]?.[timeSlot] || '#f94500'

  const html = renderToString(
    <div>
      <FaMapMarkerAlt size={30} style={{ color: markerColor }} />
    </div>
  )

  return new leaflet.DivIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })
}

export default getMarkerIcon
