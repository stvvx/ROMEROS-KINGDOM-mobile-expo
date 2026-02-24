const Category = require('../models/category')
const cloudinary = require('cloudinary')

// CREATE NEW CATEGORY
exports.newCategory = async (req, res, next) => {
    try {
        let image = null

        // Handle uploaded file (multer) or image URL
        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'categories',
                width: 150,
                crop: "scale",
            })
            image = {
                public_id: result.public_id,
                url: result.secure_url
            }
        } else if (req.body.image) {
            const result = await cloudinary.v2.uploader.upload(req.body.image, {
                folder: 'categories',
                width: 150,
                crop: "scale",
            })
            image = {
                public_id: result.public_id,
                url: result.secure_url
            }
        }

        req.body.image = image

        const category = await Category.create(req.body)

        return res.status(201).json({
            success: true,
            category
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// GET ALL CATEGORIES
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// GET SINGLE CATEGORY
exports.getSingleCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id)

        if (!category || category.isDeleted) {
            return res.status(404).json({ success: false, message: 'Category not found' })
        }

        return res.status(200).json({ success: true, category })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// UPDATE CATEGORY
exports.updateCategory = async (req, res, next) => {
    try {
        let category = await Category.findById(req.params.id)

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' })
        }

        // Handle new image upload
        if (req.file) {
            // Delete old image if exists
            if (category.image && category.image.public_id) {
                await cloudinary.v2.uploader.destroy(category.image.public_id)
            }

            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'categories',
                width: 150,
                crop: "scale",
            })

            req.body.image = {
                public_id: result.public_id,
                url: result.secure_url
            }
        }

        req.body.updatedAt = Date.now()

        category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        })

        return res.status(200).json({ success: true, category })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// DELETE CATEGORY
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id)

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' })
        }

        // Soft delete
        category.isDeleted = true
        category.deletedAt = Date.now()
        await category.save()

        return res.status(200).json({ success: true, message: 'Category deleted successfully' })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
