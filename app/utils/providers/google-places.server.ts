import { invariant } from '@epic-web/invariant'

interface NearbySearchParams {
  lat: number
  lng: number
  radius: number
}

interface NearbySearchResponse {
  results: Array<{
    place_id: string
    name: string
    vicinity: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    price_level?: number
    rating?: number
    photos?: Array<{
      photo_reference: string
    }>
  }>
  status: string
}

interface PlaceDetailsResponse {
  result: {
    place_id: string
    name: string
    url: string
    photos?: Array<{
      photo_reference: string
    }>
  }
  status: string
}

export interface Restaurant {
  id: string
  name: string
  priceLevel: number | null
  rating: number | null
  lat: number
  lng: number
  photoRef: string | null
  mapsUrl: string | null
}

/**
 * Fetches nearby restaurants from Google Places API
 */
export async function getNearbyRestaurants({
  lat,
  lng,
  radius,
}: NearbySearchParams): Promise<Restaurant[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  invariant(apiKey, 'GOOGLE_PLACES_API_KEY is required')

  // Step 1: Make the initial Nearby Search request
  const nearbySearchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  nearbySearchUrl.searchParams.append('location', `${lat},${lng}`)
  nearbySearchUrl.searchParams.append('radius', radius.toString())
  nearbySearchUrl.searchParams.append('type', 'restaurant')
  nearbySearchUrl.searchParams.append('key', apiKey)

  const nearbySearchResponse = await fetch(nearbySearchUrl.toString())
  const nearbySearchData = (await nearbySearchResponse.json()) as NearbySearchResponse

  if (nearbySearchData.status !== 'OK' && nearbySearchData.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${nearbySearchData.status}`)
  }

  if (nearbySearchData.status === 'ZERO_RESULTS' || !nearbySearchData.results.length) {
    return []
  }

  // Step 2: For each restaurant, get additional details
  const detailsPromises = nearbySearchData.results.map(async (place) => {
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    detailsUrl.searchParams.append('place_id', place.place_id)
    detailsUrl.searchParams.append('fields', 'place_id,name,url,photos')
    detailsUrl.searchParams.append('key', apiKey)

    const detailsResponse = await fetch(detailsUrl.toString())
    const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse

    if (detailsData.status !== 'OK') {
      console.error(`Failed to get details for place ${place.place_id}: ${detailsData.status}`)
      return null
    }

    // Step 3: Transform the data to match our database schema
    return {
      id: place.place_id,
      name: place.name,
      priceLevel: place.price_level ?? null,
      rating: place.rating ?? null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      photoRef: place.photos?.[0]?.photo_reference ?? null,
      mapsUrl: detailsData.result.url ?? null,
    } as Restaurant
  })

  const restaurantsWithDetails = await Promise.all(detailsPromises)
  return restaurantsWithDetails.filter((r): r is Restaurant => r !== null)
} 