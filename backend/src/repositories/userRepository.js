const User = require('../models/User');

class UserRepository {
  findByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });
    return query.select(includePassword ? '+password' : '-password');
  }

  findById(id, includePassword = false) {
    const query = User.findById(id);
    return query.select(includePassword ? '+password' : '-password');
  }

  findAll(filter = {}) {
    return User.find(filter).select('-password').sort({ createdAt: -1 });
  }

  create(data) {
    return User.create(data);
  }

  update(id, data) {
    return User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  updatePassword(id, password, mustChangePassword) {
    return User.findByIdAndUpdate(
      id,
      { password, mustChangePassword },
      { new: true, runValidators: true }
    ).select('-password');
  }

  delete(id) {
    return User.findByIdAndDelete(id).select('-password');
  }

  count(filter = {}) {
    return User.countDocuments(filter);
  }
}

module.exports = new UserRepository();
