// Conversation management: list, create, and clear chat threads
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// In-memory store fallback
const { getMemConversations, setMemConversations } = require('../config/memStore');

// List conversations
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const guestId = req.headers['x-guest-session-id'] || null;

    try {
      const query = userId ? { userId } : { guestId };
      const convs = await Conversation.find(query).sort({ updatedAt: -1 }).limit(30);
      return res.json({ conversations: convs });
    } catch {
      const memConversations = getMemConversations();
      const filtered = memConversations.filter(c => (userId && c.userId === userId) || (guestId && c.guestId === guestId));
      return res.json({ conversations: filtered });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch conversations' });
  }
});

// Create conversation
router.post('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const guestId = req.headers['x-guest-session-id'] || null;
    const title = req.body.title || 'New Conversation';

    try {
      const newConv = await Conversation.create({
        userId,
        guestId,
        title
      });
      return res.status(201).json({ conversation: newConv });
    } catch {
      const newConv = {
        id: 'conv_' + Date.now(),
        userId,
        guestId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const memConvs = getMemConversations();
      memConvs.unshift(newConv);
      return res.status(201).json({ conversation: newConv });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to create conversation' });
  }
});

// Rename conversation
router.patch('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title is required' });
    }

    try {
      const conv = await Conversation.findByIdAndUpdate(
        id,
        { title: title.trim() },
        { new: true }
      );
      return res.json({ conversation: conv });
    } catch {
      const conv = getMemConversations().find(c => c.id === id);
      if (conv) conv.title = title.trim();
      return res.json({ conversation: conv });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to rename conversation' });
  }
});

// Delete single conversation
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await Conversation.findByIdAndDelete(id);
      await Message.deleteMany({ conversationId: id });
    } catch {
      setMemConversations(getMemConversations().filter(c => c.id !== id));
    }
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete conversation' });
  }
});

// Delete all conversations
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const guestId = req.headers['x-guest-session-id'] || null;

    try {
      const query = userId ? { userId } : { guestId };
      const convs = await Conversation.find(query);
      const ids = convs.map(c => c._id);
      await Conversation.deleteMany(query);
      await Message.deleteMany({ conversationId: { $in: ids } });
    } catch {
      setMemConversations(getMemConversations().filter(c => !((userId && c.userId === userId) || (guestId && c.guestId === guestId))));
    }
    res.json({ message: 'All conversations cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to clear conversations' });
  }
});

module.exports = router;
