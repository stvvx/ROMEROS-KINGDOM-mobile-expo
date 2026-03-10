const mongoose = require('mongoose')

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please enter voucher code'],
    unique: true,
    trim: true,
    uppercase: true,
    maxLength: [40, 'Voucher code cannot exceed 40 characters'],
  },
  category: {
    type: String,
    enum: ['free-shipping', 'minimum-spend', 'monthly-voucher'],
    required: [true, 'Please select voucher category'],
  },
  month: {
  type: Number,
  min: 1,
  max: 12,
  default: null,
  validate: {
    validator: function (v) {
      if (this.category === 'monthly-voucher') return v !== null && v !== undefined;
      return true;
    },
    message: 'Month is required for monthly vouchers (1–12)',
  },
},
  badge: {
    type: String,
    required: [true, 'Please enter badge'],
    trim: true,
    maxLength: [30, 'Badge cannot exceed 30 characters'],
  },
  label: {
    type: String,
    required: [true, 'Please enter label'],
    trim: true,
    maxLength: [120, 'Label cannot exceed 120 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please enter description'],
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters'],
  },
  validText: {
    type: String,
    required: [true, 'Please enter validity text'],
    trim: true,
    maxLength: [200, 'Validity text cannot exceed 200 characters'],
  },
  leftValue: {
    type: String,
    required: [true, 'Please enter left value'],
    trim: true,
    maxLength: [60, 'Left value cannot exceed 60 characters'],
  },
  rightTag: {
    type: String,
    trim: true,
    maxLength: [20, 'Right tag cannot exceed 20 characters'],
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  claimedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  usedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
})

module.exports = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema)
