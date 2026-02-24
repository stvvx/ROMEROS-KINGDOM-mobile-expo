const express = require('express')
const router = express.Router()

const {
  newProduct,
  getSingleProduct,
  getAdminProducts,
  updateProduct,
  deleteProduct,
  getProducts,
  productSales,
  getCategories,
  createProductReview,
  getProductReviews,
  deleteReview,
} = require('../controllers/product')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')

/* ================= PRODUCT ================= */

// ✅ Create product (frontend uploads images directly to Cloudinary)
router.post(
  '/admin/product/new',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  newProduct
)

// ✅ Update product (NO MULTER HERE)
router.put(
  '/admin/product/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  updateProduct
)

// ✅ Delete product
router.delete(
  '/admin/product/:id',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  deleteProduct
)

// ✅ Admin list
router.get(
  '/admin/products',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  getAdminProducts
)

// Public
router.get('/product/:id', getSingleProduct)
router.get('/products', getProducts)
router.get('/products/categories', getCategories)

/* ================= SALES ================= */
router.get(
  '/admin/product-sales',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  productSales
)

/* ================= REVIEWS ================= */
router.put('/review', isAuthenticatedUser, createProductReview)
router.get('/reviews', isAuthenticatedUser, getProductReviews)
router.delete(
  '/reviews',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  deleteReview
)

module.exports = router