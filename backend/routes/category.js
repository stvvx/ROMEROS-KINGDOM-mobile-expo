const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");

const { 
    newCategory,
    getCategories,
    getSingleCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/category');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')

router.post('/admin/category/new', isAuthenticatedUser, authorizeRoles('admin'), upload.single('image'), newCategory);
router.get('/categories', getCategories);
router.get('/category/:id', getSingleCategory);
router.put('/admin/category/:id', isAuthenticatedUser, authorizeRoles('admin'), upload.single('image'), updateCategory);
router.delete('/admin/category/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteCategory);

module.exports = router
