/* ============================================
   MindCare AI — Conversation Model
   ============================================ */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  guestId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: 'New Conversation',
    trim: true,
    maxlength: 120
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);
