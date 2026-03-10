const Notification = require('../models/notification')
const User = require('../models/user')

// List notifications for authenticated user
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100)

    res.status(200).json({ success: true, notifications })
  } catch (err) {
    console.error('[getMyNotifications]', err)
    res.status(500).json({ success: false, message: 'Failed to load notifications' })
  }
}

// List notifications targeted to admins (role-based broadcast)
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ role: 'admin' })
      .sort({ createdAt: -1 })
      .limit(200)

    res.status(200).json({ success: true, notifications })
  } catch (err) {
    console.error('[getAdminNotifications]', err)
    res.status(500).json({ success: false, message: 'Failed to load notifications' })
  }
}

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params
    const query = req.user.role === 'admin'
      ? { _id: id, $or: [{ user: req.user._id }, { role: 'admin' }] }
      : { _id: id, user: req.user._id }

    const notif = await Notification.findOneAndUpdate(query, { isRead: true }, { new: true })

    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' })
    res.status(200).json({ success: true, notification: notif })
  } catch (err) {
    console.error('[markNotificationRead]', err)
    res.status(500).json({ success: false, message: 'Failed to update notification' })
  }
}

// Mark all for user
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { isRead: true })
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[markAllRead]', err)
    res.status(500).json({ success: false, message: 'Failed to update notifications' })
  }
}

// Save Expo push token on user
exports.savePushToken = async (req, res) => {
  try {
    const expoPushToken = req.body?.expoPushToken || req.body?.firebasePushToken
    if (!expoPushToken) return res.status(400).json({ success: false, message: 'expoPushToken required' })

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { expoPushToken },
      { new: true, select: 'expoPushToken' }
    )

    res.status(200).json({ success: true, expoPushToken: user.expoPushToken })
  } catch (err) {
    console.error('[savePushToken]', err)
    res.status(500).json({ success: false, message: 'Failed to save push token' })
  }
}