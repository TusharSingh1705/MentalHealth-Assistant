// Express rate limiting to prevent spam and protect endpoints
const rateLimit = require('express-rate-limit');

// General API rate limiter: 120 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP. Please take a mindful pause and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Chat message rate limiter: 40 requests per 10 minutes
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'You have sent messages rapidly. Please take a gentle breath and try again shortly.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoint rate limiter: 15 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many login or registration attempts. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter, chatLimiter, authLimiter };
