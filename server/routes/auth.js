// User authentication endpoints: registration, login & session check
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// In-memory fallback if MongoDB is offline
const memoryUsers = [];

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, dob } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Try MongoDB
    try {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        dob: dob || null
      });

      const token = jwt.sign(
        { id: user._id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          dob: user.dob,
          preferences: user.preferences
        }
      });
    } catch (dbErr) {
      console.warn('DB write failed, using in-memory fallback:', dbErr.message);

      const existingMem = memoryUsers.find(u => u.email === normalizedEmail);
      if (existingMem) {
        return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const memUser = {
        id: 'user_' + Date.now(),
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        dob: dob || null,
        preferences: { darkMode: false, moodReminders: true, saveHistory: true, showCitations: true }
      };
      memoryUsers.push(memUser);

      const token = jwt.sign(
        { id: memUser.id, email: memUser.email, name: memUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          dob: memUser.dob,
          preferences: memUser.preferences
        }
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check MongoDB first
    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
        }

        const token = jwt.sign(
          { id: user._id, email: user.email, name: user.name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          message: 'Logged in successfully',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            dob: user.dob,
            preferences: user.preferences
          }
        });
      }
    } catch (dbErr) {
      console.warn('DB read failed, trying in-memory users:', dbErr.message);
    }

    // In-memory fallback
    const memUser = memoryUsers.find(u => u.email === normalizedEmail);
    if (memUser) {
      const isMatch = await bcrypt.compare(password, memUser.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: memUser.id, email: memUser.email, name: memUser.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Logged in successfully',
        token,
        user: {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          dob: memUser.dob,
          preferences: memUser.preferences
        }
      });
    }

    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Internal server error during login' });
  }
});

// Current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (user) return res.json({ user });
    } catch {}

    const memUser = memoryUsers.find(u => u.id === req.user.id);
    if (memUser) {
      const { password, ...safeUser } = memUser;
      return res.json({ user: safeUser });
    }

    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch user' });
  }
});

module.exports = router;
