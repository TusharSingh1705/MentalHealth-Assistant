/* ============================================
   MindCare AI — Message Model
   ============================================ */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: null
  },
  isCrisis: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
