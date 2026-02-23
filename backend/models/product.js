const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter product name'],
    trim: true,
    maxLength: [100, 'Product name cannot exceed 100 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please enter product price'],
    default: 0.0
  },
  description: {
    type: String,
    required: [true, 'Please enter product description'],
  },
  images: [
    {
      public_id: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      _id: false // This prevents Mongoose from creating _id for each image
    }
  ],
  category: {
    type: String,
    required: [true, 'Please select category for this product']
  },
  stock: {
    type: Number,
    required: [true, 'Please enter product stock'],
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  }
})

module.exports = mongoose.model('Product', productSchema)