const Product = require('../models/product')
const Order = require('../models/order');
const cloudinary = require('cloudinary')
const APIFeatures = require('../utils/apiFeatures');

// CREATE NEW PRODUCT
exports.newProduct = async (req, res, next) => {
    try {
        let images = []

        // Handle uploaded files (multer) or image URLs
        if (req.files) {
            images = req.files.map(file => file.path)
        } else if (typeof req.body.images === 'string') {
            images.push(req.body.images)
        } else if (Array.isArray(req.body.images)) {
            images = req.body.images
        }

        const imagesLinks = []

        for (let i = 0; i < images.length; i++) {
            const result = await cloudinary.v2.uploader.upload(images[i], {
                folder: 'products',
                width: 150,
                crop: "scale",
            })
            imagesLinks.push({
                public_id: result.public_id,
                url: result.secure_url
            })
        }

        req.body.images = imagesLinks
        req.body.user = req.user.id

        const product = await Product.create(req.body)

        return res.status(201).json({
            success: true,
            product
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// GET SINGLE PRODUCT
exports.getSingleProduct = async (req, res, next) => {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.status(200).json({ success: true, product })
}

// GET ADMIN PRODUCTS
exports.getAdminProducts = async (req, res, next) => {
    const products = await Product.find()
    return res.status(200).json({ success: true, products })
}

// UPDATE PRODUCT
exports.updateProduct = async (req, res, next) => {
    let product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    let images = []

    if (req.files) images = req.files.map(file => file.path)
    else if (typeof req.body.images === 'string') images.push(req.body.images)
    else if (Array.isArray(req.body.images)) images = req.body.images

    const imagesLinks = []
    for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.v2.uploader.upload(images[i], {
            folder: 'products',
            width: 150,
            crop: "scale",
        })
        imagesLinks.push({ public_id: result.public_id, url: result.secure_url })
    }

    req.body.images = imagesLinks

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    return res.status(200).json({ success: true, product })
}

// DELETE PRODUCT
exports.deleteProduct = async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.status(200).json({ success: true, message: 'Product deleted' })
}

// GET PRODUCTS WITH PAGINATION AND FILTER
exports.getProducts = async (req, res) => {
    const resPerPage = 4
    const productsCount = await Product.countDocuments()

    const apiFeatures = new APIFeatures(Product.find(), req.query).search().filter()
    apiFeatures.pagination(resPerPage)
    const products = await apiFeatures.query
    const filteredProductsCount = products.length

    return res.status(200).json({
        success: true,
        products,
        filteredProductsCount,
        resPerPage,
        productsCount,
    })
}

// PRODUCT SALES REPORT
exports.productSales = async (req, res, next) => {
    const totalSales = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$itemsPrice" } } }])
    const sales = await Order.aggregate([
        { $project: { _id: 0, "orderItems": 1, totalPrice: true } },
        { $unwind: "$orderItems" },
        { $group: { _id: { product: "$orderItems.name" }, total: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } } } }
    ])

    if (!totalSales || !sales) return res.status(404).json({ message: 'Error retrieving sales' })

    const totalPercentage = sales.map(item => ({
        name: item._id.product,
        percent: Number(((item.total / totalSales[0].total) * 100).toFixed(2))
    }))

    return res.status(200).json({ success: true, totalPercentage, sales, totalSales })
}

// CREATE REVIEW
exports.createProductReview = async (req, res, next) => {
    const { rating, comment, productId } = req.body
    const review = { user: req.user._id, name: req.user.name, rating: Number(rating), comment }
    const product = await Product.findById(productId)

    const isReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString())
    if (isReviewed) {
        product.reviews.forEach(r => {
            if (r.user.toString() === req.user._id.toString()) {
                r.comment = comment
                r.rating = rating
            }
        })
    } else {
        product.reviews.push(review)
        product.numOfReviews = product.reviews.length
    }

    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length
    await product.save({ validateBeforeSave: false })

    return res.status(200).json({ success: true })
}

// GET PRODUCT REVIEWS
exports.getProductReviews = async (req, res, next) => {
    const product = await Product.findById(req.query.id)
    return res.status(200).json({ success: true, reviews: product.reviews })
}

// DELETE REVIEW
exports.deleteReview = async (req, res, next) => {
    const product = await Product.findById(req.query.productId)
    const reviews = product.reviews.filter(r => r._id.toString() !== req.query.id.toString())
    const numOfReviews = reviews.length
    const ratings = reviews.length ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length : 0

    await Product.findByIdAndUpdate(req.query.productId, { reviews, ratings, numOfReviews }, { new: true, runValidators: true, useFindAndModify: false })
    return res.status(200).json({ success: true })
}