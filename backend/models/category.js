const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter category name'],
        unique: true,
        trim: true,
        maxLength: [50, 'Category name cannot exceed 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxLength: [500, 'Category description cannot exceed 500 characters']
    },
    image: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        },
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

// Soft-delete fields
categorySchema.add({
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    }
})

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema)
