const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

class AuthService {
  async bootstrap(data, bootstrapKey) {
    if (bootstrapKey !== config.bootstrapKey) {
      throw new AppError('Invalid bootstrap key', 403, 'FORBIDDEN');
    }

    if (await userRepository.count({ role: 'admin' })) {
      throw new AppError('Admin already exists', 409, 'BOOTSTRAP_COMPLETE');
    }

    if (await userRepository.findByEmail(data.email)) {
      throw new AppError('Email already in use', 409, 'DUPLICATE_EMAIL');
    }

    const user = await userRepository.create({
      ...data,
      role: 'admin',
      mustChangePassword: false,
    });

    return { token: signToken(user), user: toPublicUser(user) };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, true);
    const passwordMatches = user && (await bcrypt.compare(password, user.password));

    if (!user || !user.isActive || !passwordMatches) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    return { token: signToken(user), user: toPublicUser(user) };
  }

  async getMe(id) {
    const user = await userRepository.findById(id);
    if (!user || !user.isActive) {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    return toPublicUser(user);
  }

  async changePassword(id, { currentPassword, newPassword }) {
    const user = await userRepository.findById(id, true);
    if (!user) {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userRepository.updatePassword(id, hashedPassword, false);
    if (!updatedUser) {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    return {
      message: 'Password changed successfully',
      mustChangePassword: false,
    };
  }
}

module.exports = new AuthService();
