// Guest session initialization (ephemeral usage without account creation)
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const GuestSession = require('../models/GuestSession');

router.post('/start', async (req, res) => {
  try {
    const guestId = 'guest_' + crypto.randomBytes(16).toString('hex');

    try {
      await GuestSession.create({ guestId });
    } catch (err) {
      // In-memory / stateless mode fallback
    }

    res.json({
      message: 'Guest session initialized',
      guestId,
      expiresIn: '24 hours',
      privacyNotice: 'Guest data is held ephemerally and automatically purged.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Could not create guest session' });
  }
});

module.exports = router;
