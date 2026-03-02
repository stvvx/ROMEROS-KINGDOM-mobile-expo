const Notification = require('../models/notification')
const User = require('../models/user')
const { sendExpoPush } = require('./push')

// Create a notification and attempt to deliver a push (if tokens exist)
async function notify({ userId = null, role = 'user', title, message, type = 'system', refId = null, refModel = null, data = {} }) {
  const payload = { user: userId, role, title, message, type, refId, refModel, data }
  const doc = await Notification.create(payload)

  // Push to specific user or broadcast to admins
  let tokens = []
  if (userId) {
    const user = await User.findById(userId).select('expoPushToken')
    if (user?.expoPushToken) tokens.push(user.expoPushToken)
  } else if (role === 'admin') {
    const admins = await User.find({ role: 'admin', expoPushToken: { $ne: null } }).select('expoPushToken')
    tokens = admins.map(a => a.expoPushToken)
  }

  if (tokens.length) {
    sendExpoPush(tokens, {
      title,
      body: message,
      data: { type, refId, refModel, ...data },
    })
  }

  return doc
}

module.exports = { notify }