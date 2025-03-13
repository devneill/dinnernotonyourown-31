import { http, HttpResponse } from 'msw'

// Mock restaurant data with realistic values
const mockRestaurants = [
  {
    place_id: 'ChIJc3qCMBf1UocRvasmc_pxrm8',
    name: 'Red Iguana',
    vicinity: '736 W North Temple, Salt Lake City',
    geometry: {
      location: {
        lat: 40.7711,
        lng: -111.9103
      }
    },
    price_level: 2,
    rating: 4.7,
    photos: [
      {
        photo_reference: 'AUy1YQ3NUZNGnL017ZuvQuN4rkE433tlCTKGB2H6INwTNVh67eDAIR5ogEMQBGdqAu6z5jbb20ZkfDeIkkIXBU_LAeWrr876QP2f7RTm6dj2VAJIS65_Xs_Ay14ycnd1vn8VleQm6y2C2map1K45I7w8HOCpMmlW8pY1ZHKP79xIA8wYFOT3tZNlUkU2ZZqgSGGX8M0UmyybS9DTsICYjXqerWK9t0DqClexPdpX3XoYrt3R2vN7kIsBgxa-hify0LzDzfQWOeEHGUrJRcySmIJJksI0kcnWNsJsjxZFOHkV07-BrDxvaFTuY6vKFwOFYXQn5P4922_dl8A'
      }
    ]
  },
  {
    place_id: 'ChIJ_w0HyRD1UocRNAS1sIpDkvA',
    name: 'The Copper Onion',
    vicinity: '111 E Broadway, Salt Lake City',
    geometry: {
      location: {
        lat: 40.7644,
        lng: -111.8884
      }
    },
    price_level: 3,
    rating: 4.6,
    photos: [
      {
        photo_reference: 'AUy1YQ2dcb8cT1Nbg9nB78jJK6tYSymC_0IGMZr3A-QR4fs_kLRa3RPoMMudJD4gX-qZ-Z7ezDP2XpkW3qOblya3Cf83W-MfgBYRnU5pTwaE0mxltHP4mZImMJCbn5eNFIniGbHDMCR5iTIsDIER96e362DNYtgkdczJBfmunSgn4QbiFpQICLslOWoXEQO4i1FkBUsfFYEqWzUAWrBYB1Y5uwGor9h7Hh44Z6d_IGoAjSUb34yi4XT6pgDhp8rJUEnL5RDxLNu3wf1sV53W29ufU-dPLnl9HzP0ReDNBHmQf1m8MDA04Wz1dMsWbCk-qCMlqaaaiEdLQ6w'
      }
    ]
  },
  {
    place_id: 'ChIJG_1NJgX1UocRjeIgB8zitwM',
    name: 'Takashi',
    vicinity: '18 W Market St, Salt Lake City',
    geometry: {
      location: {
        lat: 40.7631,
        lng: -111.8919
      }
    },
    price_level: 3,
    rating: 4.5,
    photos: [
      {
        photo_reference: 'AUy1YQ3y-p3v9qnmai6UF1K9BS68dA4tLlbVEY30kk1isc7MgA6gT8RLd3nfy2z0FgQ1DxB1zQh7d71HxJrUAs2VLuQFsOIgc7EeHwyfEjVEGHqeuIbnzmCB3NYiHusuSEbSm78uWN7jk6XG88xlqkT69f5uGoq_Opv2WyLpO_gDhKbG8P0DJuM3ZoipR26jHRFmkRExs57g47bq-1nJ2rFK9pOTuXvZj12FgL6y27HUUyoYcOmo2AOTQ66inO2tyKg0tjPhcuWznhg9z9l1Ij6z8XEZwnDkN38OlDDcl1tpu59jiHdGCjtL5id4D7HhO_LPgAqMgGbkqbE'
      }
    ]
  },
  {
    place_id: 'ChIJLbMbzmn1UocRgXLe7ravgWM',
    name: 'Current Fish & Oyster',
    vicinity: '279 E 300 S, Salt Lake City',
    geometry: {
      location: {
        lat: 40.7644,
        lng: -111.8825
      }
    },
    price_level: 3,
    rating: 4.5,
    photos: [
      {
        photo_reference: 'AUy1YQ3rmpmNge4D0Z8axiSkesmrcDlKEQarR_wRRbYn2NkqomH26yO3J2ol_zlvOmJRIICsmaMSMM4SBuXKxAiBwO3-nY0LhXWDMQolzFa5wI7jQV1QhwlxbuAmdhdVjD5O-kEnPG5qcR1meygStLUleWpVY1Ov-dkz7irMEjaB3_G9ey8fvRQh8qNxJ-KQk-KuzVAfF_HqidEiVEfVwFT36eb-VgPyZ4ci7R9bNNpIPTveGuNdpW0L0FCxVx_v-bFb7qvXOI4EIUn6UjensK6DsLjoAfVfeUdf5xkHIIuiBSkDq6xwtzqj4OTo5Hry7IYGCMUGT31wRNk'
      }
    ]
  },
  {
    place_id: 'ChIJZeGm9AT1UocRwbTMnrAwuzE',
    name: 'Pago',
    vicinity: '878 S 900 E, Salt Lake City',
    geometry: {
      location: {
        lat: 40.7502,
        lng: -111.8647
      }
    },
    price_level: 3,
    rating: 4.4,
    photos: [
      {
        photo_reference: 'AUy1YQ3OJd-43qdwejow2kkP8NKvVc7DildXoX5YsWjcZ6cEt3q7aKulYrUkbBp10JXKqfEtSTpOzzmnS1A3fynDknaHvuE9UCyiU5EoZSNGpNek9140919x-CZqnpNg34oxbXiCpcrKR9byXwyX7D9uqva2Z79L8sPXSe67a_i8e2k5Q616XW3n3cZXzBPR1bhqgPEA1K5ivZgA5e12Cy8wTe5b_7H-R9Ltt3prCaG7RQpPKTVPxJYorHZp8NOoTXhTys9SrVjEpqmhJjcglWzkuLW1APz_snINj1E1N1STll9keolLU5Y0xRgn6W3ZIyHwZTCIdaJK7P8'
      }
    ]
  }
]

// Define the type for place details
interface PlaceDetail {
  place_id: string
  name: string
  url: string
  photos: Array<{
    photo_reference: string
  }>
}

// Mock place details for each restaurant
const mockPlaceDetails: Record<string, PlaceDetail> = {
  'ChIJc3qCMBf1UocRvasmc_pxrm8': {
    place_id: 'ChIJc3qCMBf1UocRvasmc_pxrm8',
    name: 'Red Iguana',
    url: 'https://maps.google.com/?cid=13953536716899853407',
    photos: [
      {
        photo_reference: 'AUy1YQ3NUZNGnL017ZuvQuN4rkE433tlCTKGB2H6INwTNVh67eDAIR5ogEMQBGdqAu6z5jbb20ZkfDeIkkIXBU_LAeWrr876QP2f7RTm6dj2VAJIS65_Xs_Ay14ycnd1vn8VleQm6y2C2map1K45I7w8HOCpMmlW8pY1ZHKP79xIA8wYFOT3tZNlUkU2ZZqgSGGX8M0UmyybS9DTsICYjXqerWK9t0DqClexPdpX3XoYrt3R2vN7kIsBgxa-hify0LzDzfQWOeEHGUrJRcySmIJJksI0kcnWNsJsjxZFOHkV07-BrDxvaFTuY6vKFwOFYXQn5P4922_dl8A'
      }
    ]
  },
  'ChIJ_w0HyRD1UocRNAS1sIpDkvA': {
    place_id: 'ChIJ_w0HyRD1UocRNAS1sIpDkvA',
    name: 'The Copper Onion',
    url: 'https://maps.google.com/?cid=14608454308096512320',
    photos: [
      {
        photo_reference: 'AUy1YQ2dcb8cT1Nbg9nB78jJK6tYSymC_0IGMZr3A-QR4fs_kLRa3RPoMMudJD4gX-qZ-Z7ezDP2XpkW3qOblya3Cf83W-MfgBYRnU5pTwaE0mxltHP4mZImMJCbn5eNFIniGbHDMCR5iTIsDIER96e362DNYtgkdczJBfmunSgn4QbiFpQICLslOWoXEQO4i1FkBUsfFYEqWzUAWrBYB1Y5uwGor9h7Hh44Z6d_IGoAjSUb34yi4XT6pgDhp8rJUEnL5RDxLNu3wf1sV53W29ufU-dPLnl9HzP0ReDNBHmQf1m8MDA04Wz1dMsWbCk-qCMlqaaaiEdLQ6w'
      }
    ]
  },
  'ChIJG_1NJgX1UocRjeIgB8zitwM': {
    place_id: 'ChIJG_1NJgX1UocRjeIgB8zitwM',
    name: 'Takashi',
    url: 'https://maps.google.com/?cid=14608454308096512321',
    photos: [
      {
        photo_reference: 'AUy1YQ3y-p3v9qnmai6UF1K9BS68dA4tLlbVEY30kk1isc7MgA6gT8RLd3nfy2z0FgQ1DxB1zQh7d71HxJrUAs2VLuQFsOIgc7EeHwyfEjVEGHqeuIbnzmCB3NYiHusuSEbSm78uWN7jk6XG88xlqkT69f5uGoq_Opv2WyLpO_gDhKbG8P0DJuM3ZoipR26jHRFmkRExs57g47bq-1nJ2rFK9pOTuXvZj12FgL6y27HUUyoYcOmo2AOTQ66inO2tyKg0tjPhcuWznhg9z9l1Ij6z8XEZwnDkN38OlDDcl1tpu59jiHdGCjtL5id4D7HhO_LPgAqMgGbkqbE'
      }
    ]
  },
  'ChIJLbMbzmn1UocRgXLe7ravgWM': {
    place_id: 'ChIJLbMbzmn1UocRgXLe7ravgWM',
    name: 'Current Fish & Oyster',
    url: 'https://maps.google.com/?cid=14608454308096512322',
    photos: [
      {
        photo_reference: 'AUy1YQ3rmpmNge4D0Z8axiSkesmrcDlKEQarR_wRRbYn2NkqomH26yO3J2ol_zlvOmJRIICsmaMSMM4SBuXKxAiBwO3-nY0LhXWDMQolzFa5wI7jQV1QhwlxbuAmdhdVjD5O-kEnPG5qcR1meygStLUleWpVY1Ov-dkz7irMEjaB3_G9ey8fvRQh8qNxJ-KQk-KuzVAfF_HqidEiVEfVwFT36eb-VgPyZ4ci7R9bNNpIPTveGuNdpW0L0FCxVx_v-bFb7qvXOI4EIUn6UjensK6DsLjoAfVfeUdf5xkHIIuiBSkDq6xwtzqj4OTo5Hry7IYGCMUGT31wRNk'
      }
    ]
  },
  'ChIJZeGm9AT1UocRwbTMnrAwuzE': {
    place_id: 'ChIJZeGm9AT1UocRwbTMnrAwuzE',
    name: 'Pago',
    url: 'https://maps.google.com/?cid=14608454308096512323',
    photos: [
      {
        photo_reference: 'AUy1YQ3OJd-43qdwejow2kkP8NKvVc7DildXoX5YsWjcZ6cEt3q7aKulYrUkbBp10JXKqfEtSTpOzzmnS1A3fynDknaHvuE9UCyiU5EoZSNGpNek9140919x-CZqnpNg34oxbXiCpcrKR9byXwyX7D9uqva2Z79L8sPXSe67a_i8e2k5Q616XW3n3cZXzBPR1bhqgPEA1K5ivZgA5e12Cy8wTe5b_7H-R9Ltt3prCaG7RQpPKTVPxJYorHZp8NOoTXhTys9SrVjEpqmhJjcglWzkuLW1APz_snINj1E1N1STll9keolLU5Y0xRgn6W3ZIyHwZTCIdaJK7P8'
      }
    ]
  }
}

// Mock photo data - just return a valid response for any photo reference
const mockPhotoResponse = new Uint8Array([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 
  0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 
  0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 
  0x00, 0xFF, 0xD9
])

// Define handlers for Google Places API
export const handlers = [
  // Handler for nearby search
  http.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', () => {
    return HttpResponse.json({
      results: mockRestaurants,
      status: 'OK'
    })
  }),

  // Handler for place details
  http.get('https://maps.googleapis.com/maps/api/place/details/json', ({ request }) => {
    const url = new URL(request.url)
    const placeId = url.searchParams.get('place_id')
    
    if (placeId && mockPlaceDetails[placeId]) {
      return HttpResponse.json({
        result: mockPlaceDetails[placeId],
        status: 'OK'
      })
    }
    
    return HttpResponse.json({
      status: 'NOT_FOUND'
    }, { status: 404 })
  }),

  // Handler for place photos
  http.get('https://maps.googleapis.com/maps/api/place/photo', () => {
    return new HttpResponse(mockPhotoResponse, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    })
  }),

  // Handler for our internal photo endpoint
  http.get('/resources/maps/photo', () => {
    return new HttpResponse(mockPhotoResponse, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    })
  })
] 