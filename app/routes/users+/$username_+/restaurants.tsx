import { invariant } from '@epic-web/invariant'
import { type User } from '@prisma/client'
import { MapPin, Star, Map } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useSearchParams, Link, useFetcher } from 'react-router'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardFooter } from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Toggle } from '#app/components/ui/toggle.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { getAllRestaurantDetails, joinDinnerGroup, leaveDinnerGroup, type RestaurantWithDetails } from '#app/utils/restaurants.server.ts'

// Hilton coordinates in Salt Lake City
const HILTON_COORDINATES = {
  lat: 40.7596,
  lng: -111.8867,
}

// Convert miles to meters for the API
function milesToMeters(miles: number): number {
  return miles * 1609.34
}

// Schema for action validation
const ActionSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('join'),
    restaurantId: z.string(),
  }),
  z.object({
    intent: z.literal('leave'),
  }),
])

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  // Get the username from params
  const username = params.username
  invariant(typeof username === 'string', 'Username is required')
  
  // Verify the user exists
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })
  invariant(user, `User with username ${username} not found`)
  
  // Get URL search params for filtering
  const url = new URL(request.url)
  const distanceParam = url.searchParams.get('distance')
  const ratingParam = url.searchParams.get('rating')
  const priceParam = url.searchParams.get('price')
  
  // Convert distance to meters (default to 1 mile)
  const distanceMiles = distanceParam ? parseInt(distanceParam, 10) : 1
  const radiusMeters = milesToMeters(distanceMiles)
  
  // Get all restaurant details
  const allRestaurants = await getAllRestaurantDetails({
    lat: HILTON_COORDINATES.lat,
    lng: HILTON_COORDINATES.lng,
    radius: radiusMeters,
    userId,
  })
  
  // Split into two lists: with attendees and without
  const restaurantsWithAttendance = allRestaurants
    .filter(r => r.attendeeCount > 0)
    .sort((a, b) => b.attendeeCount - a.attendeeCount)
  
  // Apply filters to restaurants without attendees
  let restaurantsNearby = allRestaurants.filter(r => r.attendeeCount === 0)
  
  // Apply distance filter
  if (distanceParam) {
    const maxDistance = parseInt(distanceParam, 10)
    restaurantsNearby = restaurantsNearby.filter(r => r.distance <= maxDistance)
  }
  
  // Apply rating filter
  if (ratingParam) {
    const minRating = parseInt(ratingParam, 10)
    restaurantsNearby = restaurantsNearby.filter(r => 
      r.rating !== null && r.rating >= minRating
    )
  }
  
  // Apply price filter
  if (priceParam) {
    const priceLevel = parseInt(priceParam, 10)
    restaurantsNearby = restaurantsNearby.filter(r => 
      r.priceLevel === priceLevel
    )
  }
  
  // Sort by rating (desc) and distance (asc) as tiebreaker
  restaurantsNearby.sort((a, b) => {
    // First by rating (descending)
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0)
    if (ratingDiff !== 0) return ratingDiff
    
    // Then by distance (ascending)
    return a.distance - b.distance
  })
  
  // Limit to top 15 results
  restaurantsNearby = restaurantsNearby.slice(0, 15)
  
  return {
    restaurantsWithAttendance,
    restaurantsNearby,
    filters: {
      distance: distanceParam ? parseInt(distanceParam, 10) : null,
      rating: ratingParam ? parseInt(ratingParam, 10) : null,
      price: priceParam ? parseInt(priceParam, 10) : null,
    },
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  
  const formData = await request.formData()
  const submission = Object.fromEntries(formData)
  
  const result = ActionSchema.safeParse(submission)
  
  if (!result.success) {
    return { status: 'error', errors: result.error.flatten() }
  }
  
  const { intent } = result.data
  
  if (intent === 'join') {
    const { restaurantId } = result.data
    await joinDinnerGroup({ restaurantId, userId })
  } else if (intent === 'leave') {
    await leaveDinnerGroup({ userId })
  }
  
  return { status: 'success' }
}

export default function RestaurantsRoute() {
  const data = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Find if the user is attending any restaurant
  const userAttendingRestaurant = data.restaurantsWithAttendance.find(
    restaurant => restaurant.isUserAttending
  )
  
  const updateFilter = (key: string, value: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      if (value === null) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
      return newParams
    }, { preventScrollReset: true, replace: true })
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="container py-8"
    >
      <motion.h1 
        className="mb-4 text-center text-3xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {userAttendingRestaurant 
          ? (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 1] }}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
            >
              🎉 You've got dinner plans! 🎉
            </motion.span>
          ) 
          : (
            <motion.span
              initial={{ rotate: 0 }}
              animate={{ rotate: [-5, 5, 0] }}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
            >
              You're having dinner on your own 😭
            </motion.span>
          )
        }
      </motion.h1>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.h2 
          className="mb-4 mt-8 text-center text-2xl font-bold text-primary"
          whileInView={{ scale: [0.95, 1.05, 1] }}
          transition={{ duration: 0.5 }}
        >
          Dinner Plans
        </motion.h2>
        
        <DinnerPlansSection restaurants={data.restaurantsWithAttendance} />
        
        <motion.h2 
          className="mb-4 mt-12 text-center text-2xl font-bold text-primary"
          whileInView={{ scale: [0.95, 1.05, 1] }}
          transition={{ duration: 0.5 }}
        >
          Restaurants Nearby
        </motion.h2>
        
        <Filters 
          currentDistance={data.filters.distance}
          currentRating={data.filters.rating}
          currentPrice={data.filters.price}
          onFilterChange={updateFilter}
        />
        
        <div className="mt-6 restaurants-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.restaurantsNearby.length === 0 && (
            <div className="col-span-3 text-center py-10">
              <p className="text-muted-foreground">No restaurants found matching your filters.</p>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {data.restaurantsNearby.map((restaurant) => (
              <motion.div
                key={restaurant.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <RestaurantCard restaurant={restaurant} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DinnerPlansSection({ restaurants }: { restaurants: RestaurantWithDetails[] }) {
  return (
    <motion.div 
      className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)" }}
    >
      {restaurants.length > 0 ? (
        <div className="dinner-plans-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {restaurants.map(restaurant => (
              <motion.div
                key={restaurant.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <RestaurantCard restaurant={restaurant} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          className="flex h-[440px] items-center justify-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p 
            className="text-lg text-primary/70"
            initial={{ y: 10 }}
            animate={{ y: [10, -10, 0] }}
            transition={{ duration: 0.8, times: [0, 0.6, 1] }}
          >
            Everyone is having dinner on their own 🥲
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  )
}

function Filters({ 
  currentDistance, 
  currentRating, 
  currentPrice,
  onFilterChange,
}: { 
  currentDistance: number | null
  currentRating: number | null
  currentPrice: number | null
  onFilterChange: (key: string, value: string | null) => void
}) {
  return (
    <motion.div 
      className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div layout>
        <h3 className="mb-3 font-medium text-primary">Distance</h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 5, 10].map(distance => (
            <motion.div
              key={distance}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toggle
                pressed={currentDistance === distance}
                onPressedChange={() => 
                  onFilterChange('distance', currentDistance === distance ? null : distance.toString())
                }
                className={cn(
                  "w-full border-2",
                  currentDistance === distance 
                    ? "border-primary" 
                    : "border-input"
                )}
                variant="outline"
              >
                {distance}mi
              </Toggle>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      <motion.div layout>
        <h3 className="mb-3 font-medium text-primary">Rating</h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(rating => (
            <motion.div
              key={rating}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toggle
                pressed={currentRating === rating}
                onPressedChange={() => 
                  onFilterChange('rating', currentRating === rating ? null : rating.toString())
                }
                className={cn(
                  "w-full border-2",
                  currentRating === rating 
                    ? "border-primary" 
                    : "border-input"
                )}
                variant="outline"
              >
                {'⭐'.repeat(rating)}
              </Toggle>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      <motion.div layout>
        <h3 className="mb-3 font-medium text-primary">Price</h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(price => (
            <motion.div
              key={price}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toggle
                pressed={currentPrice === price}
                onPressedChange={() => 
                  onFilterChange('price', currentPrice === price ? null : price.toString())
                }
                className={cn(
                  "w-full border-2",
                  currentPrice === price 
                    ? "border-primary" 
                    : "border-input"
                )}
                variant="outline"
              >
                {'$'.repeat(price)}
              </Toggle>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function RestaurantCard({ restaurant }: { restaurant: RestaurantWithDetails }) {
  const fetcher = useFetcher()
  const isJoining = fetcher.state === 'submitting' && 
    fetcher.formData?.get('intent') === 'join'
  const isLeaving = fetcher.state === 'submitting' && 
    fetcher.formData?.get('intent') === 'leave'
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <motion.div 
        className="relative h-48"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
      >
        {restaurant.photoRef ? (
          <img 
            src={`/resources/maps/photo?photoRef=${restaurant.photoRef}`}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-muted-foreground">No image available</p>
          </div>
        )}
        <div className="absolute left-0 top-0 flex gap-2 p-2">
          {restaurant.rating ? (
            <motion.span 
              className="rounded bg-black/70 px-2 py-1 text-sm text-white"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <Star className="mr-1 inline-block h-4 w-4 text-yellow-400" />
              {restaurant.rating}
            </motion.span>
          ) : null}
          
          {restaurant.priceLevel ? (
            <motion.span 
              className="rounded bg-black/70 px-2 py-1 text-sm text-white"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {'$'.repeat(restaurant.priceLevel)}
            </motion.span>
          ) : null}
        </div>
      </motion.div>
      
      <CardContent className="p-4">
        <motion.h3 
          className="mb-2 font-bold text-primary"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          {restaurant.name}
        </motion.h3>
        
        <div className="mb-2 flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-4 w-4 text-primary" />
          <span>{restaurant.distance} mi</span>
        </div>
        
        {restaurant.mapsUrl && (
          <motion.a 
            href={restaurant.mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mb-2 flex items-center text-sm text-primary hover:underline"
            whileHover={{ x: 5 }}
            transition={{ duration: 0.2 }}
          >
            <Map className="mr-1 h-4 w-4" />
            <span>Directions</span>
          </motion.a>
        )}
        
        <motion.div 
          className="mt-2 text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <span className={cn(
            "rounded-full px-2 py-0.5",
            restaurant.attendeeCount > 0 
              ? "bg-primary/10 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            {restaurant.attendeeCount} attending
          </span>
        </motion.div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <fetcher.Form method="post" className="w-full">
          {restaurant.isUserAttending ? (
            <>
              <input type="hidden" name="intent" value="leave" />
              <motion.div 
                className="w-full"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <StatusButton
                  type="submit"
                  status={isLeaving ? 'pending' : 'idle'}
                  className="w-full"
                  variant="destructive"
                >
                  {isLeaving ? 'Leaving...' : 'Leave'}
                </StatusButton>
              </motion.div>
            </>
          ) : (
            <>
              <input type="hidden" name="intent" value="join" />
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <motion.div 
                className="w-full"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <StatusButton
                  type="submit"
                  status={isJoining ? 'pending' : 'idle'}
                  className="w-full"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </StatusButton>
              </motion.div>
            </>
          )}
        </fetcher.Form>
      </CardFooter>
    </Card>
  )
} 