const express = require('express')
const router = express.Router()

const {
  createVoucher,
  getAdminVouchers,
  getPublicVouchers,
  getSingleVoucher,
  getMyClaimedVoucherIds,
  claimVoucher,
  updateVoucher,
  deleteVoucher,
} = require('../controllers/voucher')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')

router.post('/admin/voucher/new', isAuthenticatedUser, authorizeRoles('admin'), createVoucher)
router.get('/admin/vouchers', isAuthenticatedUser, authorizeRoles('admin'), getAdminVouchers)
router.put('/admin/voucher/:id', isAuthenticatedUser, authorizeRoles('admin'), updateVoucher)
router.delete('/admin/voucher/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteVoucher)

router.get('/vouchers', getPublicVouchers)
router.get('/voucher/:id', getSingleVoucher)
router.get('/my/vouchers/claimed', isAuthenticatedUser, getMyClaimedVoucherIds)
router.post('/voucher/:id/claim', isAuthenticatedUser, claimVoucher)

module.exports = router
