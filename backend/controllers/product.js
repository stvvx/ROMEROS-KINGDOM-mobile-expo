const Product = require('../models/product')
const Order = require('../models/order')
const APIFeatures = require('../utils/apiFeatures')

// ==========================
// CREATE NEW PRODUCT
// ==========================
exports.newProduct = async (req, res) => {
  try {
    console.log('[newProduct] ===== START REQUEST =====')
    console.log('[newProduct] Full request body:', JSON.stringify(req.body, null, 2))
    console.log('[newProduct] User from auth:', req.user ? {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name
    } : 'No user found')
    
    const { images, name, price, description, category, stock } = req.body
    
    // Validate all required fields
    const missingFields = []
    if (!name) missingFields.push('name')
    if (!price && price !== 0) missingFields.push('price')
    if (!description) missingFields.push('description')
    if (!category) missingFields.push('category')
    if (!stock && stock !== 0) missingFields.push('stock')
    
    if (missingFields.length > 0) {
      console.log('[newProduct] Missing required fields:', missingFields)
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    // Validate images
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log('[newProduct] No images provided or invalid format')
      return res.status(400).json({
        success: false,
        message: 'Product images are required and must be an array'
      })
    }

    // Validate each image has required properties
    const invalidImages = images.filter(img => !img.public_id || !img.url)
    if (invalidImages.length > 0) {
      console.log('[newProduct] Invalid image format:', invalidImages)
      return res.status(400).json({
        success: false,
        message: 'Each image must have public_id and url'
      })
    }

    // Normalize & limit images (max 3)
    req.body.images = images.slice(0, 3).map(img => ({
      public_id: String(img.public_id).trim(),
      url: String(img.url).trim(),
    }))
    
    console.log('[newProduct] Normalized images:', JSON.stringify(req.body.images, null, 2))

    // Add timestamps
    req.body.createdAt = new Date()
    
    // Add user if authenticated (optional based on your schema)
    if (req.user && req.user.id) {
      req.body.user = req.user.id
      console.log('[newProduct] Added user to product:', req.user.id)
    }

    // Ensure numeric fields are proper numbers
    req.body.price = Number(price)
    req.body.stock = Number(stock)
    
    console.log('[newProduct] Final product data:', JSON.stringify(req.body, null, 2))
    
    // Create product
    const product = await Product.create(req.body)
    
    console.log('[newProduct] Product created successfully with ID:', product._id)

    res.status(201).json({
      success: true,
      product
    })
  } catch (error) {
    console.error('[newProduct Error] ===== ERROR START =====')
    console.error('[newProduct Error] Name:', error.name)
    console.error('[newProduct Error] Message:', error.message)
    console.error('[newProduct Error] Stack:', error.stack)
    
    if (error.name === 'ValidationError') {
      const validationErrors = {}
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message
      }
      console.error('[newProduct Error] Validation errors:', validationErrors)
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      })
    }
    
    if (error.code === 11000) {
      console.error('[newProduct Error] Duplicate key error')
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// GET SINGLE PRODUCT
// ==========================
exports.getSingleProduct = async (req, res) => {
  try {
    console.log('[getSingleProduct] Fetching product with ID:', req.params.id)
    
    const product = await Product.findById(req.params.id)

    if (!product || product.isDeleted) {
      console.log('[getSingleProduct] Product not found or deleted')
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    console.log('[getSingleProduct] Product found:', product._id)
    
    res.status(200).json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('[getSingleProduct Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// GET ADMIN PRODUCTS
// ==========================
exports.getAdminProducts = async (req, res) => {
  try {
    console.log('[getAdminProducts] Fetching all non-deleted products')
    
    const products = await Product.find({ isDeleted: { $ne: true } })
    
    console.log('[getAdminProducts] Found', products.length, 'products')

    res.status(200).json({
      success: true,
      products,
    })
  } catch (error) {
    console.error('[getAdminProducts Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// UPDATE PRODUCT
// ==========================
exports.updateProduct = async (req, res) => {
  try {
    console.log('[updateProduct] ===== START UPDATE =====')
    console.log('[updateProduct] Product ID:', req.params.id)
    console.log('[updateProduct] Update data:', JSON.stringify(req.body, null, 2))

    let product = await Product.findById(req.params.id)

    if (!product) {
      console.log('[updateProduct] Product not found')
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    console.log('[updateProduct] Found product:', product._id)

    // Process images if provided
    if (req.body.images) {
      if (!Array.isArray(req.body.images)) {
        return res.status(400).json({
          success: false,
          message: 'Images must be an array'
        })
      }
      
      req.body.images = req.body.images.slice(0, 3).map(img => ({
        public_id: String(img.public_id || '').trim(),
        url: String(img.url || '').trim(),
      }))
      
      console.log('[updateProduct] Updated images:', req.body.images.length)
    }

    // Ensure numeric fields are numbers
    if (req.body.price) req.body.price = Number(req.body.price)
    if (req.body.stock) req.body.stock = Number(req.body.stock)

    // Add updated timestamp
    req.body.updatedAt = new Date()

    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )

    console.log('[updateProduct] Product updated successfully')
    
    res.status(200).json({
      success: true,
      product
    })
  } catch (error) {
    console.error('[updateProduct Error]', error)
    
    if (error.name === 'ValidationError') {
      const validationErrors = {}
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      })
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// SOFT DELETE PRODUCT
// ==========================
exports.deleteProduct = async (req, res) => {
  try {
    console.log('[deleteProduct] Soft deleting product:', req.params.id)
    
    const product = await Product.findById(req.params.id)

    if (!product) {
      console.log('[deleteProduct] Product not found')
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    product.isDeleted = true
    product.deletedAt = Date.now()
    await product.save()

    console.log('[deleteProduct] Product soft-deleted successfully')
    
    res.status(200).json({
      success: true,
      message: 'Product soft-deleted',
    })
  } catch (error) {
    console.error('[deleteProduct Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// GET PRODUCTS (PUBLIC)
// ==========================
exports.getProducts = async (req, res) => {
  try {
    console.log('[getProducts] Fetching public products with filters:', req.query)
    
    const resPerPage = 4
    const productsCount = await Product.countDocuments({
      isDeleted: { $ne: true },
    })

    const apiFeatures = new APIFeatures(
      Product.find({ isDeleted: { $ne: true } }),
      req.query
    ).search().filter()

    apiFeatures.pagination(resPerPage)

    const products = await apiFeatures.query
    
    console.log('[getProducts] Found', products.length, 'products')

    res.status(200).json({
      success: true,
      products,
      filteredProductsCount: products.length,
      resPerPage,
      productsCount,
    })
  } catch (error) {
    console.error('[getProducts Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// PRODUCT SALES
// ==========================
exports.productSales = async (req, res) => {
  try {
    console.log('[productSales] Calculating product sales')
    
    const totalSales = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$itemsPrice' } } },
    ])

    const sales = await Order.aggregate([
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.name',
          total: {
            $sum: {
              $multiply: [
                '$orderItems.price',
                '$orderItems.quantity',
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } }
    ])

    console.log('[productSales] Sales calculated successfully')
    
    res.status(200).json({
      success: true,
      totalSales: totalSales[0]?.total || 0,
      sales,
    })
  } catch (error) {
    console.error('[productSales Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error calculating sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// CREATE PRODUCT REVIEW
// ==========================
exports.createProductReview = async (req, res) => {
  try {
    const { rating, comment, productId } = req.body
    
    console.log('[createProductReview] Creating review for product:', productId)
    console.log('[createProductReview] User:', req.user?._id)
    console.log('[createProductReview] Rating:', rating)
    console.log('[createProductReview] Comment:', comment)

    if (!rating || !comment || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rating, comment and productId'
      })
    }

    const product = await Product.findById(productId)

    if (!product) {
      console.log('[createProductReview] Product not found')
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    }

    const isReviewed = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    )

    if (isReviewed) {
      console.log('[createProductReview] Updating existing review')
      product.reviews.forEach(r => {
        if (r.user.toString() === req.user._id.toString()) {
          r.rating = rating
          r.comment = comment
        }
      })
    } else {
      console.log('[createProductReview] Adding new review')
      product.reviews.push(review)
    }

    product.numOfReviews = product.reviews.length
    product.ratings =
      product.reviews.reduce((acc, r) => acc + r.rating, 0) /
      product.reviews.length

    await product.save({ validateBeforeSave: false })
    
    console.log('[createProductReview] Review saved successfully')

    res.status(200).json({ 
      success: true,
      message: 'Review added successfully'
    })
  } catch (error) {
    console.error('[createProductReview Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// GET PRODUCT REVIEWS
// ==========================
exports.getProductReviews = async (req, res) => {
  try {
    console.log('[getProductReviews] Fetching reviews for product:', req.query.id)
    
    const product = await Product.findById(req.query.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    console.log('[getProductReviews] Found', product.reviews?.length || 0, 'reviews')

    res.status(200).json({
      success: true,
      reviews: product.reviews || [],
    })
  } catch (error) {
    console.error('[getProductReviews Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// DELETE REVIEW
// ==========================
exports.deleteReview = async (req, res) => {
  try {
    console.log('[deleteReview] Deleting review:', req.query.id)
    console.log('[deleteReview] For product:', req.query.productId)
    
    const product = await Product.findById(req.query.productId)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const reviews = product.reviews.filter(
      r => r._id.toString() !== req.query.id
    )

    const ratings = reviews.length === 0
      ? 0
      : reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length

    await Product.findByIdAndUpdate(
      req.query.productId,
      {
        reviews,
        ratings,
        numOfReviews: reviews.length,
      },
      { new: true }
    )

    console.log('[deleteReview] Review deleted successfully')

    res.status(200).json({ 
      success: true,
      message: 'Review deleted successfully'
    })
  } catch (error) {
    console.error('[deleteReview Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ==========================
// GET CATEGORIES
// ==========================
exports.getCategories = async (req, res) => {
  try {
    console.log('[getCategories] Fetching product categories')
    
    const categories = await Product.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { 
        _id: '$category', 
        count: { $sum: 1 } 
      }},
      { $project: { 
        _id: 0, 
        category: '$_id', 
        count: 1 
      }},
      { $sort: { category: 1 } }
    ])

    console.log('[getCategories] Found', categories.length, 'categories')

    res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('[getCategories Error]', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}