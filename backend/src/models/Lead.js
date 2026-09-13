const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['created', 'status_changed', 'note_added', 'field_updated', 'imported'],
      required: true,
    },
    detail: String,
    performedBy: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100, trim: true },
    phone: { type: String, required: true, maxlength: 20, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    budget: { type: Number, min: 0, default: 0 },
    location: { type: String, maxlength: 200, trim: true },
    propertyType: {
      type: String,
      enum: ['1BHK', '2BHK', '3BHK', 'Plot', 'Villa', 'Commercial', 'Other'],
    },
    source: {
      type: String,
      enum: ['Facebook', 'Google', 'Referral', 'Walk-in', 'Website', 'Other'],
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Site Visit', 'Closed'],
      default: 'New',
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    followUpDate: { type: Date, default: null },
    activities: [activitySchema],
    notes: [noteSchema],
  },
  { timestamps: true }
);

leadSchema.index({ name: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedAgent: 1 });

module.exports = mongoose.model('Lead', leadSchema);
