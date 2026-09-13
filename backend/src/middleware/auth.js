const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');
const { cacheGet, cacheSet } = require('../config/redis');

async function auth(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const cacheKey = `user:${decoded.id}:active`;
    const cachedStatus = await cacheGet(cacheKey);

    if (cachedStatus === 'false') {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      await cacheSet(cacheKey, 'false', 60);
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    await cacheSet(cacheKey, 'true', 60);
    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
    };
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Invalid or expired token', 401, 'UNAUTHORIZED')
    );
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { auth, allowRoles };
