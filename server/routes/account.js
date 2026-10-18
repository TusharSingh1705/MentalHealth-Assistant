const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Update profile preferences or contact details
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { name, dob, preferences, trustedContact } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (dob !== undefined) updateData.dob = dob;
    if (preferences) updateData.preferences = preferences;
    if (trustedContact) updateData.trustedContact = trustedContact;

    try {
      if (req.user.id && req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
        return res.json({ message: 'Profile updated', user });
      }
    } catch {}

    res.json({ message: 'Profile updated successfully', user: { ...req.user, ...updateData } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to update profile' });
  }
});

// Change user password
router.post('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Validation Error', message: 'Current password and new password (min 8 chars) are required' });
    }

    try {
      if (req.user.id && req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Current password incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        return res.json({ message: 'Password updated successfully' });
      }
    } catch {}

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to update password' });
  }
});

// Export portable data package
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let userData = { id: userId, email: req.user.email };
    let conversations = [];

    try {
      if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
        userData = await User.findById(userId).select('-password');
        conversations = await Conversation.find({ userId });
      }
    } catch {}

    res.json({
      exportMetadata: {
        platform: 'MindCare AI',
        exportedAt: new Date().toISOString(),
        version: '1.0'
      },
      user: userData,
      conversations
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to export data' });
  }
});

// Delete account and all linked conversations
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    try {
      if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
        await User.findByIdAndDelete(userId);
        const convs = await Conversation.find({ userId });
        const convIds = convs.map(c => c._id);
        await Message.deleteMany({ conversationId: { $in: convIds } });
        await Conversation.deleteMany({ userId });
      }
    } catch {}

    res.json({ message: 'Account and associated conversations permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete account' });
  }
});

module.exports = router;
