import express from 'express'
import { getRateLimitStatus } from '../utils/ratelimitquery' // adjust path as needed

const app = express()

// This endpoint will show the rate limiter status for the current user/request
app.get('/ratelimit-status', (req, res) => {
  // Assuming you populate req.user via authentication middleware/session
  res.json(getRateLimitStatus(req))
})
