const Voucher = require('../models/voucher')
const Notification = require('../models/notification')
const User = require('../models/user')
const { sendExpoPush } = require('../utils/push')

async function notifyAllUsersForNewVoucher(voucher) {
  const users = await User.find({
    role: { $ne: 'admin' },
    isActive: { $ne: false },
  }).select('_id expoPushToken')

  if (!users.length) {
    return
  }

  const title = 'New voucher available'
  const message = `${voucher.label} (${voucher.code}) is now available. Claim it while stocks last.`
  const now = new Date()

  const notifications = users.map((user) => ({
    user: user._id,
    role: 'user',
    title,
    message,
    type: 'system',
    refId: String(voucher._id),
    refModel: 'Voucher',
    data: {
      voucherId: String(voucher._id),
      voucherCode: voucher.code,
      category: voucher.category,
    },
    isRead: false,
    createdAt: now,
  }))

  await Notification.insertMany(notifications, { ordered: false })

  const tokens = [...new Set(
    users
      .map((user) => user.expoPushToken)
      .filter((token) => typeof token === 'string' && token.startsWith('ExponentPushToken['))
  )]

  if (tokens.length) {
    await sendExpoPush(tokens, {
      title,
      body: message,
      data: {
        type: 'system',
        refId: String(voucher._id),
        refModel: 'Voucher',
        voucherId: String(voucher._id),
        voucherCode: voucher.code,
      },
    })
  }
}

/* ─── Helper: check if a monthly voucher is claimable ─── */
function getMonthlyClaimError(voucher) {
  if (voucher.category !== 'monthly-voucher') return null

  const currentMonth   = new Date().getMonth() + 1 // e.g. 3 = March
  const claimableMonth = currentMonth + 1           // e.g. 4 = April

  if (voucher.month === null || voucher.month === undefined) {
    return 'This voucher is not yet available.'
  }
  if (voucher.month < currentMonth) {
    return 'This voucher has expired.'
  }
  if (voucher.month === currentMonth) {
    return "This month's voucher has already passed."
  }
  if (voucher.month > claimableMonth) {
    return 'This voucher is not yet available.'
  }

  return null // voucher.month === claimableMonth → claimable ✓
}

// ─────────────────────────────────────────────
// CREATE VOUCHER
// ─────────────────────────────────────────────
exports.createVoucher = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      code: String(req.body.code || '').trim().toUpperCase(),
      updatedAt: new Date(),
      createdAt: new Date(),
    }

    const voucher = await Voucher.create(payload)
    await notifyAllUsersForNewVoucher(voucher)

    return res.status(201).json({
      success: true,
      voucher,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// GET ADMIN VOUCHERS
// ─────────────────────────────────────────────
exports.getAdminVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      vouchers,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// GET PUBLIC VOUCHERS
// ─────────────────────────────────────────────
exports.getPublicVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      isDeleted: { $ne: true },
      isActive: true,
    }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      vouchers,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// GET CLAIMED VOUCHER IDS FOR CURRENT USER
// ─────────────────────────────────────────────
exports.getMyClaimedVoucherIds = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      isDeleted: { $ne: true },
      isActive: true,
      claimedBy: req.user._id,
    }).select('_id usedBy')

    const userId = String(req.user._id)
    const voucherIds = []
    const redeemedVoucherIds = []

    for (const voucher of vouchers) {
      const isRedeemed = (voucher.usedBy || []).some((id) => String(id) === userId)
      if (isRedeemed) {
        redeemedVoucherIds.push(String(voucher._id))
      } else {
        voucherIds.push(String(voucher._id))
      }
    }

    return res.status(200).json({
      success: true,
      voucherIds,
      redeemedVoucherIds,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// CLAIM VOUCHER
// ─────────────────────────────────────────────
exports.claimVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)

    if (!voucher || voucher.isDeleted || !voucher.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      })
    }

    // Block claiming locked monthly vouchers (server-side enforcement)
    const monthlyError = getMonthlyClaimError(voucher)
    if (monthlyError) {
      return res.status(403).json({
        success: false,
        message: monthlyError,
      })
    }

    const userId = String(req.user._id)
    const alreadyClaimed = (voucher.claimedBy || []).some((id) => String(id) === userId)

    if (alreadyClaimed) {
      return res.status(200).json({
        success: true,
        alreadyClaimed: true,
        message: 'Voucher already claimed',
      })
    }

    voucher.claimedBy = [...(voucher.claimedBy || []), req.user._id]
    voucher.updatedAt = new Date()
    await voucher.save()

    return res.status(200).json({
      success: true,
      alreadyClaimed: false,
      message: 'Voucher claimed successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// GET SINGLE VOUCHER
// ─────────────────────────────────────────────
exports.getSingleVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)

    if (!voucher || voucher.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      })
    }

    return res.status(200).json({
      success: true,
      voucher,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// UPDATE VOUCHER
// ─────────────────────────────────────────────
exports.updateVoucher = async (req, res) => {
  try {
    let voucher = await Voucher.findById(req.params.id)

    if (!voucher || voucher.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      })
    }

    const payload = {
      ...req.body,
      updatedAt: new Date(),
    }

    if (payload.code) {
      payload.code = String(payload.code).trim().toUpperCase()
    }

    voucher = await Voucher.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    })

    return res.status(200).json({
      success: true,
      voucher,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─────────────────────────────────────────────
// DELETE VOUCHER (SOFT DELETE)
// ─────────────────────────────────────────────
exports.deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)

    if (!voucher || voucher.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found',
      })
    }

    voucher.isDeleted = true
    voucher.deletedAt = new Date()
    voucher.updatedAt = new Date()

    await voucher.save()

    return res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}