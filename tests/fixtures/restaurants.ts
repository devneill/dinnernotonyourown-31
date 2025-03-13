import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { cache, lruCache } from '#app/utils/cache.server.ts'

// Hilton coordinates in Salt Lake City (same as used in the restaurants route)
const HILTON_COORDINATES = {
  lat: 40.7596,
  lng: -111.8867,
}

// Real restaurant data that matches our Google Places API mock
const realRestaurants = [
  {
    id: 'ChIJc3qCMBf1UocRvasmc_pxrm8',
    name: 'Red Iguana',
    priceLevel: 2,
    rating: 4.7,
    lat: 40.7711,
    lng: -111.9103,
    photoRef: 'AUy1YQ3NUZNGnL017ZuvQuN4rkE433tlCTKGB2H6INwTNVh67eDAIR5ogEMQBGdqAu6z5jbb20ZkfDeIkkIXBU_LAeWrr876QP2f7RTm6dj2VAJIS65_Xs_Ay14ycnd1vn8VleQm6y2C2map1K45I7w8HOCpMmlW8pY1ZHKP79xIA8wYFOT3tZNlUkU2ZZqgSGGX8M0UmyybS9DTsICYjXqerWK9t0DqClexPdpX3XoYrt3R2vN7kIsBgxa-hify0LzDzfQWOeEHGUrJRcySmIJJksI0kcnWNsJsjxZFOHkV07-BrDxvaFTuY6vKFwOFYXQn5P4922_dl8A',
    mapsUrl: 'https://maps.google.com/?cid=13953536716899853407',
  },
  {
    id: 'ChIJ_w0HyRD1UocRNAS1sIpDkvA',
    name: 'The Copper Onion',
    priceLevel: 3,
    rating: 4.6,
    lat: 40.7644,
    lng: -111.8884,
    photoRef: 'AUy1YQ2dcb8cT1Nbg9nB78jJK6tYSymC_0IGMZr3A-QR4fs_kLRa3RPoMMudJD4gX-qZ-Z7ezDP2XpkW3qOblya3Cf83W-MfgBYRnU5pTwaE0mxltHP4mZImMJCbn5eNFIniGbHDMCR5iTIsDIER96e362DNYtgkdczJBfmunSgn4QbiFpQICLslOWoXEQO4i1FkBUsfFYEqWzUAWrBYB1Y5uwGor9h7Hh44Z6d_IGoAjSUb34yi4XT6pgDhp8rJUEnL5RDxLNu3wf1sV53W29ufU-dPLnl9HzP0ReDNBHmQf1m8MDA04Wz1dMsWbCk-qCMlqaaaiEdLQ6w',
    mapsUrl: 'https://maps.google.com/?cid=14608454308096512320',
  },
  {
    id: 'ChIJG_1NJgX1UocRjeIgB8zitwM',
    name: 'Takashi',
    priceLevel: 3,
    rating: 4.5,
    lat: 40.7631,
    lng: -111.8919,
    photoRef: 'AUy1YQ3y-p3v9qnmai6UF1K9BS68dA4tLlbVEY30kk1isc7MgA6gT8RLd3nfy2z0FgQ1DxB1zQh7d71HxJrUAs2VLuQFsOIgc7EeHwyfEjVEGHqeuIbnzmCB3NYiHusuSEbSm78uWN7jk6XG88xlqkT69f5uGoq_Opv2WyLpO_gDhKbG8P0DJuM3ZoipR26jHRFmkRExs57g47bq-1nJ2rFK9pOTuXvZj12FgL6y27HUUyoYcOmo2AOTQ66inO2tyKg0tjPhcuWznhg9z9l1Ij6z8XEZwnDkN38OlDDcl1tpu59jiHdGCjtL5id4D7HhO_LPgAqMgGbkqbE',
    mapsUrl: 'https://maps.google.com/?cid=14608454308096512321',
  },
  {
    id: 'ChIJLbMbzmn1UocRgXLe7ravgWM',
    name: 'Current Fish & Oyster',
    priceLevel: 3,
    rating: 4.5,
    lat: 40.7644,
    lng: -111.8825,
    photoRef: 'AUy1YQ3rmpmNge4D0Z8axiSkesmrcDlKEQarR_wRRbYn2NkqomH26yO3J2ol_zlvOmJRIICsmaMSMM4SBuXKxAiBwO3-nY0LhXWDMQolzFa5wI7jQV1QhwlxbuAmdhdVjD5O-kEnPG5qcR1meygStLUleWpVY1Ov-dkz7irMEjaB3_G9ey8fvRQh8qNxJ-KQk-KuzVAfF_HqidEiVEfVwFT36eb-VgPyZ4ci7R9bNNpIPTveGuNdpW0L0FCxVx_v-bFb7qvXOI4EIUn6UjensK6DsLjoAfVfeUdf5xkHIIuiBSkDq6xwtzqj4OTo5Hry7IYGCMUGT31wRNk',
    mapsUrl: 'https://maps.google.com/?cid=14608454308096512322',
  },
  {
    id: 'ChIJZeGm9AT1UocRwbTMnrAwuzE',
    name: 'Pago',
    priceLevel: 3,
    rating: 4.4,
    lat: 40.7502,
    lng: -111.8647,
    photoRef: 'AUy1YQ3OJd-43qdwejow2kkP8NKvVc7DildXoX5YsWjcZ6cEt3q7aKulYrUkbBp10JXKqfEtSTpOzzmnS1A3fynDknaHvuE9UCyiU5EoZSNGpNek9140919x-CZqnpNg34oxbXiCpcrKR9byXwyX7D9uqva2Z79L8sPXSe67a_i8e2k5Q616XW3n3cZXzBPR1bhqgPEA1K5ivZgA5e12Cy8wTe5b_7H-R9Ltt3prCaG7RQpPKTVPxJYorHZp8NOoTXhTys9SrVjEpqmhJjcglWzkuLW1APz_snINj1E1N1STll9keolLU5Y0xRgn6W3ZIyHwZTCIdaJK7P8',
    mapsUrl: 'https://maps.google.com/?cid=14608454308096512323',
  }
]

export async function createRestaurantFixtures() {
  // First clean up any existing data
  await cleanupRestaurantFixtures()

  // Add timestamps to each restaurant
  const restaurantsWithTimestamps = realRestaurants.map(restaurant => ({
    ...restaurant,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  try {
    // Insert restaurants into the database
    await prisma.restaurant.createMany({
      data: restaurantsWithTimestamps,
    })
    
    // Update the cache with our test data
    // This ensures that the cache has our test data when the application tries to read from it
    const now = Date.now()
    const metadata = { createdTime: now, ttl: 1000 * 60 * 60 }
    
    // Update the LRU cache with our database restaurants
    lruCache.set('restaurants:db', {
      metadata,
      value: restaurantsWithTimestamps,
    })
    
    // Also update the SQLite cache if it's being used
    await cache.set('restaurants:db', {
      metadata,
      value: restaurantsWithTimestamps,
    })
    
    // Update the cache for the specific location query that will be used in tests
    // This simulates the result of the Google Places API call
    const cacheKey = `restaurants:${HILTON_COORDINATES.lat}:${HILTON_COORDINATES.lng}:1609.34`
    lruCache.set(cacheKey, {
      metadata,
      value: restaurantsWithTimestamps,
    })
    
    console.log(`Successfully created ${restaurantsWithTimestamps.length} restaurant fixtures and updated cache`)
    return restaurantsWithTimestamps
  } catch (error) {
    console.error('Error creating restaurant fixtures:', error)
    throw error
  }
}

export async function cleanupRestaurantFixtures() {
  try {
    // Delete all restaurants, dinner groups, and attendees
    await prisma.attendee.deleteMany({})
    await prisma.dinnerGroup.deleteMany({})
    await prisma.restaurant.deleteMany({})
    
    // Clear the cache
    lruCache.delete('restaurants:db')
    await cache.delete('restaurants:db')
    
    // Clear location-specific cache entries
    const cacheKey = `restaurants:${HILTON_COORDINATES.lat}:${HILTON_COORDINATES.lng}:1609.34`
    lruCache.delete(cacheKey)
    await cache.delete(cacheKey)
    
    console.log('Successfully cleaned up restaurant fixtures and cache')
  } catch (error) {
    console.error('Error cleaning up restaurant fixtures:', error)
    throw error
  }
}

export async function createDinnerGroup(restaurantId: string) {
  return prisma.dinnerGroup.create({
    data: {
      restaurantId,
      notes: faker.lorem.sentence(),
      createdAt: new Date(),
    },
  })
}

export async function addAttendee(dinnerGroupId: string, userId: string) {
  return prisma.attendee.create({
    data: {
      userId,
      dinnerGroupId,
      createdAt: new Date(),
    },
  })
}

export async function debugRestaurantState() {
  try {
    // Check database state
    const dbRestaurants = await prisma.restaurant.findMany()
    console.log(`Database has ${dbRestaurants.length} restaurants:`, 
      dbRestaurants.map(r => r.name).join(', '))
    
    // Check LRU cache state
    const lruDbEntry = lruCache.get('restaurants:db')
    console.log(`LRU cache 'restaurants:db' entry exists: ${Boolean(lruDbEntry)}`)
    if (lruDbEntry) {
      const restaurants = lruDbEntry.value as any[]
      console.log(`LRU cache has ${restaurants.length} restaurants:`, 
        restaurants.map((r: any) => r.name).join(', '))
    }
    
    // Check location-specific cache
    const cacheKey = `restaurants:${HILTON_COORDINATES.lat}:${HILTON_COORDINATES.lng}:1609.34`
    const lruLocationEntry = lruCache.get(cacheKey)
    console.log(`LRU cache '${cacheKey}' entry exists: ${Boolean(lruLocationEntry)}`)
    if (lruLocationEntry) {
      const restaurants = lruLocationEntry.value as any[]
      console.log(`LRU location cache has ${restaurants.length} restaurants:`, 
        restaurants.map((r: any) => r.name).join(', '))
    }
    
    return {
      dbCount: dbRestaurants.length,
      lruDbCount: lruDbEntry ? (lruDbEntry.value as any[]).length : 0,
      lruLocationCount: lruLocationEntry ? (lruLocationEntry.value as any[]).length : 0
    }
  } catch (error) {
    console.error('Error debugging restaurant state:', error)
    return { dbCount: 0, lruDbCount: 0, lruLocationCount: 0 }
  }
} 