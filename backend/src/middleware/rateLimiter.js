const rateLimit = require('express-rate-limit');

const createLimiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });

module.exports = {
  loginLimiter: createLimiter(10),
  bootstrapLimiter: createLimiter(5),
};
