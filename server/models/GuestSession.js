/* ============================================
   MindCare AI — GuestSession Model
   Ephemeral sessions that auto-expire after 24 hours
   ============================================ */

const mongoose = require('mongoose');

const guestSessionSchema = new mongoose.Schema({
  guestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL 24 hours
  }
});

module.exports = mongoose.model('GuestSession', guestSessionSchema);
