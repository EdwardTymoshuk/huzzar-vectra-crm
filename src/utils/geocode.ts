export const cleanStreetName = (street: string): string => {
  return street.replace(/^(ul\.|al\.|pl\.)\s+/i, '').trim()
}

export async function getCoordinatesFromAddress(address: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`
    )

    const data = await response.json()

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  return null
}
