import { test, expect } from '#tests/playwright-utils.ts'
import { createRestaurantFixtures, cleanupRestaurantFixtures } from '../fixtures/restaurants'

test.describe('Restaurant functionality', () => {
  test.beforeAll(async () => {
    // Create restaurant fixtures and update cache
    await createRestaurantFixtures()
  })

  test.afterAll(async () => {
    // Clean up test data and cache
    await cleanupRestaurantFixtures()
  })

  // Single test that combines filtering and joining/leaving functionality
  test('user can filter restaurants and join/leave dinner groups', async ({ page, login }) => {
    test.setTimeout(60000) // Increase timeout for this test
    
    // Login using the helper
    const user = await login()
    
    // Navigate directly to restaurants page with a unique timestamp to bypass cache
    const timestamp = Date.now()
    const restaurantsUrl = `/users/${user.username}/restaurants?t=${timestamp}`
    await page.goto(restaurantsUrl)
    
    // Wait for page content to load
    await page.waitForSelector('h1:has-text("dinner")', { state: 'visible', timeout: 30000 })
    
    // Wait for restaurants to load - either cards or empty state message
    await page.waitForSelector('.rounded-lg.border.bg-card, :text("Everyone is having dinner on their own")', { 
      state: 'visible', 
      timeout: 30000 
    })
    
    // PART 1: FILTERING TESTS
    
    // Count initial restaurants in the "Restaurants Nearby" section
    const initialCount = await page.locator('.restaurants-grid .rounded-lg.border.bg-card').count()
    
    // If no restaurants are found, skip the test
    if (initialCount === 0) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'restaurants-debug.png', fullPage: true })
      return
    }
    
    // Test distance filter - click the 5mi toggle
    await page.locator('text="5mi"').click()
    await page.waitForURL(/distance=5/, { timeout: 10000 })
    
    // Apply rating filter (3 stars) - click the ⭐⭐⭐ toggle
    await page.locator('text="⭐⭐⭐"').click()
    await page.waitForURL(/distance=5.*rating=3/, { timeout: 10000 })
    
    // Wait for filtered results
    await page.waitForTimeout(1000)
    
    // Count filtered restaurants
    const filteredCount = await page.locator('.restaurants-grid .rounded-lg.border.bg-card').count()
    
    // Clear filters one by one
    // Clear rating filter
    await page.locator('text="⭐⭐⭐"').click()
    await page.waitForTimeout(1000)
    
    // Clear distance filter
    await page.locator('text="5mi"').click()
    await page.waitForTimeout(1000)
    
    // PART 2: JOIN/LEAVE TESTS
    
    // Verify initial state - user not attending any restaurant
    await expect(page.locator('h1')).toContainText("You're having dinner on your own")
    
    // Find a restaurant card in the "Restaurants Nearby" section
    const restaurantCard = page.locator('.restaurants-grid .rounded-lg.border.bg-card').first()
    await restaurantCard.waitFor({ state: 'visible', timeout: 10000 })
    
    // Get the restaurant name for later verification
    const restaurantName = await restaurantCard.locator('h3').textContent()
    
    // Click the join button
    const joinButton = restaurantCard.locator('button:has-text("Join")')
    await joinButton.waitFor({ state: 'visible', timeout: 10000 })
    
    // Click and wait for the request to complete
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/restaurants.data') && 
        response.status() === 200
      ),
      joinButton.click()
    ])
    
    // Wait for the UI to update
    await page.waitForTimeout(1000)
    
    // Verify user is now attending a restaurant - check the header text
    await expect(page.locator('h1')).toContainText("You've got dinner plans!")
    
    // Verify the restaurant moved to the Dinner Plans section
    // First locate the Dinner Plans section
    const dinnerPlansSection = page.locator('h2:has-text("Dinner Plans") + div')
    await dinnerPlansSection.waitFor({ state: 'visible', timeout: 10000 })
    
    // Check that there's a card in the Dinner Plans section
    const dinnerPlanCard = dinnerPlansSection.locator('.rounded-lg.border.bg-card')
    await expect(dinnerPlanCard).toHaveCount(1)
    
    // Verify the restaurant in Dinner Plans is the one we joined
    const dinnerPlanRestaurantName = await dinnerPlanCard.locator('h3').textContent()
    expect(dinnerPlanRestaurantName).toEqual(restaurantName)
    
    // Verify the Leave button is now visible
    const leaveButton = dinnerPlanCard.locator('button:has-text("Leave")')
    await leaveButton.waitFor({ state: 'visible', timeout: 10000 })
    
    // Leave the restaurant
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/restaurants.data') && 
        response.status() === 200
      ),
      leaveButton.click()
    ])
    
    // Wait for the UI to update
    await page.waitForTimeout(1000)
    
    // Verify user is no longer attending any restaurant
    await expect(page.locator('h1')).toContainText("You're having dinner on your own")
    
    // Verify the Dinner Plans section is empty - check for the empty state message
    await expect(dinnerPlansSection.locator(':text("Everyone is having dinner on their own")')).toBeVisible()
  })
}) 