import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const photoRef = url.searchParams.get('photoRef')
  
  invariant(photoRef, 'photoRef is required')
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  invariant(apiKey, 'GOOGLE_PLACES_API_KEY is required')
  
  const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo')
  photoUrl.searchParams.append('maxwidth', '400')
  photoUrl.searchParams.append('photoreference', photoRef)
  photoUrl.searchParams.append('key', apiKey)
  
  const response = await fetch(photoUrl.toString())
  
  if (!response.ok) {
    throw new Response('Failed to fetch photo', { status: response.status })
  }
  
  // Forward the response headers and body
  const headers = new Headers()
  response.headers.forEach((value, key) => {
    headers.set(key, value)
  })
  
  // Set cache control for better performance
  headers.set('Cache-Control', 'public, max-age=86400') // 1 day
  
  return new Response(response.body, {
    status: response.status,
    headers,
  })
} 