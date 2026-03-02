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
  getMyReviews,
  getAllReviews,
} = require('../controllers/product')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')
const upload = require('../utils/multer')

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
router.put('/review', isAuthenticatedUser, upload.array('reviewImages', 4), createProductReview)
router.get('/reviews', isAuthenticatedUser, getProductReviews)
router.get('/reviews/my', isAuthenticatedUser, getMyReviews)
router.get(
  '/admin/reviews',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  getAllReviews
)
router.delete(
  '/reviews',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  deleteReview
)

module.exports = router