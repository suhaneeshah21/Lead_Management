const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');
const { cacheDelete } = require('../config/redis');

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

class UserService {
  async directory() {
    const users = await userRepository.findAll({ isActive: true });
    return users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }));
  }

  async list() {
    const users = await userRepository.findAll();
    return users.map(toPublicUser);
  }

  async create(data) {
    if (await userRepository.findByEmail(data.email)) {
      throw new AppError('Email already in use', 409, 'DUPLICATE_EMAIL');
    }

    const user = await userRepository.create({
      ...data,
      role: data.role || 'agent',
      mustChangePassword: true,
    });

    return toPublicUser(user);
  }

  async update(id, data) {
    const user = await userRepository.update(id, data);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (data.isActive === false) {
      await cacheDelete(`user:${id}:active`);
    }

    return toPublicUser(user);
  }

  async resetPassword(id, temporaryPassword) {
    const hash = await bcrypt.hash(temporaryPassword, 10);
    const user = await userRepository.updatePassword(id, hash, true);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    return {
      message: 'Password reset. User must change on next login.',
      mustChangePassword: true,
    };
  }

  async remove(id, currentUserId) {
    if (id === currentUserId) {
      throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE');
    }

    const user = await userRepository.delete(id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  }
}

module.exports = new UserService();
