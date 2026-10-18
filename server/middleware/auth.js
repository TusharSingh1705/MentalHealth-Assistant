// JWT verification middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mindcare-super-secret-jwt-key-2026';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Support mock dev tokens
    if (token.startsWith('jwt_mock_')) {
      req.user = { id: 'mock_user_' + token.slice(9), email: 'user@example.com', isGuest: false };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    if (token.startsWith('jwt_mock_')) {
      req.user = { id: 'mock_user_' + token.slice(9), email: 'user@example.com', isGuest: false };
    } else {
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
