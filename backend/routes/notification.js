const express = require('express')
const router = express.Router()

const {
  getMyNotifications,
  getAdminNotifications,
  markNotificationRead,
  markAllRead,
  savePushToken,
} = require('../controllers/notification')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')

router.get('/notifications', isAuthenticatedUser, getMyNotifications)
router.get('/admin/notifications', isAuthenticatedUser, authorizeRoles('admin'), getAdminNotifications)
router.post('/notifications/:id/read', isAuthenticatedUser, markNotificationRead)
router.post('/notifications/read-all', isAuthenticatedUser, markAllRead)
router.post('/push/token', isAuthenticatedUser, savePushToken)

module.exports = router