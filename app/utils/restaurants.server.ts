import { type User } from '@prisma/client'
import { cachified } from '@epic-web/cachified'
import { prisma } from './db.server.ts'
import { cache, lruCache } from './cache.server.ts'
import { getNearbyRestaurants, type Restaurant } from './providers/google-places.server.ts'

export interface RestaurantWithDetails extends Restaurant {
  attendeeCount: number
  isUserAttending: boolean
  distance: number
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180)
  
  const R = 3958.8 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return parseFloat(distance.toFixed(1))
}

/**
 * Upsert restaurants from Google Places API to database
 */
async function upsertRestaurants(restaurants: Restaurant[]) {
  const upsertPromises = restaurants.map(restaurant => 
    prisma.restaurant.upsert({
      where: { id: restaurant.id },
      update: {
        name: restaurant.name,
        priceLevel: restaurant.priceLevel,
        rating: restaurant.rating,
        lat: restaurant.lat,
        lng: restaurant.lng,
        photoRef: restaurant.photoRef,
        mapsUrl: restaurant.mapsUrl,
        updatedAt: new Date(),
      },
      create: {
        id: restaurant.id,
        name: restaurant.name,
        priceLevel: restaurant.priceLevel,
        rating: restaurant.rating,
        lat: restaurant.lat,
        lng: restaurant.lng,
        photoRef: restaurant.photoRef,
        mapsUrl: restaurant.mapsUrl,
      },
    })
  )
  
  return Promise.all(upsertPromises)
}

/**
 * Get all restaurants from database
 */
async function getRestaurantsFromDb() {
  return prisma.restaurant.findMany({
    orderBy: { updatedAt: 'desc' },
  })
}

/**
 * Get attendee count for each restaurant
 */
async function getAttendeeCountByRestaurant() {
  const dinnerGroups = await prisma.dinnerGroup.findMany({
    include: {
      _count: {
        select: { attendees: true },
      },
    },
  })
  
  return dinnerGroups.reduce<Record<string, number>>((acc, group) => {
    acc[group.restaurantId] = group._count.attendees
    return acc
  }, {})
}

/**
 * Get the restaurant the user is attending
 */
async function getUserAttendingRestaurant(userId: User['id']) {
  const attendee = await prisma.attendee.findUnique({
    where: { userId },
    include: {
      dinnerGroup: true,
    },
  })
  
  return attendee?.dinnerGroup.restaurantId || null
}

/**
 * Get all restaurant details including attendance and distance
 */
export async function getAllRestaurantDetails({
  lat,
  lng,
  radius,
  userId,
}: {
  lat: number
  lng: number
  radius: number
  userId?: User['id']
}) {
  // Fetch restaurants from Google Places API with caching
  const restaurants = await cachified({
    key: `restaurants:${lat}:${lng}:${radius}`,
    cache: lruCache,
    ttl: 1000 * 60 * 60, // 1 hour
    staleWhileRevalidate: 1000 * 60 * 5, // 5 minutes
    async getFreshValue() {
      const restaurants = await getNearbyRestaurants({ lat, lng, radius })
      await upsertRestaurants(restaurants)
      return restaurants
    },
  })
  
  // Get restaurants from database (should be cached by the above operation)
  const dbRestaurants = await cachified({
    key: 'restaurants:db',
    cache,
    ttl: 1000 * 60 * 60, // 1 hour
    staleWhileRevalidate: 1000 * 60 * 5, // 5 minutes
    getFreshValue: getRestaurantsFromDb,
  })
  
  // Get real-time attendance data (not cached)
  const attendeeCounts = await getAttendeeCountByRestaurant()
  const userAttendingRestaurantId = userId 
    ? await getUserAttendingRestaurant(userId)
    : null
  
  // Combine all data
  const restaurantsWithDetails: RestaurantWithDetails[] = dbRestaurants.map(restaurant => ({
    ...restaurant,
    attendeeCount: attendeeCounts[restaurant.id] || 0,
    isUserAttending: restaurant.id === userAttendingRestaurantId,
    distance: calculateDistance(lat, lng, restaurant.lat, restaurant.lng),
  }))
  
  return restaurantsWithDetails
}

/**
 * Join a dinner group for a restaurant
 */
export async function joinDinnerGroup({
  restaurantId,
  userId,
}: {
  restaurantId: string
  userId: User['id']
}) {
  // First, leave any existing dinner group
  await leaveDinnerGroup({ userId })
  
  // Find or create a dinner group for this restaurant
  const dinnerGroup = await prisma.dinnerGroup.upsert({
    where: { restaurantId },
    update: {},
    create: {
      restaurantId,
    },
  })
  
  // Create an attendee record
  return prisma.attendee.create({
    data: {
      userId,
      dinnerGroupId: dinnerGroup.id,
    },
  })
}

/**
 * Leave a dinner group
 */
export async function leaveDinnerGroup({
  userId,
}: {
  userId: User['id']
}) {
  return prisma.attendee.deleteMany({
    where: { userId },
  })
} 