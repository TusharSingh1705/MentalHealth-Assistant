require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimit');

// Route modules
const authRoutes = require('./routes/auth');
const guestRoutes = require('./routes/guest');
const chatRoutes = require('./routes/chat');
const conversationsRoutes = require('./routes/conversations');
const accountRoutes = require('./routes/account');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (falls back cleanly if local instance isn't running)
connectDB();

// Global middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply basic rate limiting across API endpoints
app.use('/api', generalLimiter);

// Serve frontend static assets from client/
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/account', accountRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback for direct navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} does not exist` });
  }
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred. Please try again shortly.' 
      : err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`MentalHealth Assistant server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
