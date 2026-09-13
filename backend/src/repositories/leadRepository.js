const Lead = require('../models/Lead');

const assignedAgentProjection = {
  path: 'assignedAgent',
  select: 'name email',
};

class LeadRepository {
  find(filter, options) {
    return Lead.find(filter)
      .populate(assignedAgentProjection)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit);
  }

  findAll(filter) {
    return Lead.find(filter).populate(assignedAgentProjection).sort({ createdAt: -1 });
  }

  findById(id) {
    return Lead.findById(id).populate(assignedAgentProjection);
  }

  findOne(filter) {
    return Lead.findOne(filter).populate(assignedAgentProjection);
  }

  count(filter) {
    return Lead.countDocuments(filter);
  }

  create(data) {
    return Lead.create(data);
  }

  update(id, update) {
    return Lead.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).populate(assignedAgentProjection);
  }

  delete(id) {
    return Lead.findByIdAndDelete(id);
  }

  addNote(id, note, activity) {
    return Lead.findByIdAndUpdate(
      id,
      { $push: { notes: note, activities: activity } },
      { new: true, runValidators: true }
    ).populate(assignedAgentProjection);
  }

  insertMany(rows) {
    return Lead.insertMany(rows, { ordered: false });
  }

  aggregate(pipeline) {
    return Lead.aggregate(pipeline);
  }
}

module.exports = new LeadRepository();
