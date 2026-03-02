const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['order', 'product', 'review', 'system'],
    default: 'system',
  },
  refId: {
    type: String,
    default: null,
  },
  refModel: {
    type: String,
    default: null,
  },
  data: {
    type: Object,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

notificationSchema.index({ user: 1, role: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)