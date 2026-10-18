// Guest session middleware for privacy-preserving chats
const crypto = require('crypto');

const handleGuestSession = (req, res, next) => {
  let guestId = req.headers['x-guest-session-id'];

  if (!guestId) {
    guestId = 'guest_' + crypto.randomBytes(12).toString('hex');
    res.setHeader('x-guest-session-id', guestId);
  }

  req.guestId = guestId;
  next();
};

module.exports = { handleGuestSession };
