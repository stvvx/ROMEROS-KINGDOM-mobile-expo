const Order = require('../models/order');
const Product = require('../models/product');
const Voucher = require('../models/voucher');
const sendEmail = require('../utils/sendEmail');
const { notify } = require('../utils/notification');
const { sendExpoPush } = require('../utils/push');
const User = require('../models/user');



// Create a new order   =>  /api/v1/order/new
exports.newOrder = async (req, res, next) => {
    const {
        orderItems,
        shippingInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,
        voucherId

    } = req.body;
    try {
        // Ensure we have a usable model (workaround for require/circular issues)
        const mongoose = require('mongoose')
        const OrderModel = (Order && typeof Order.create === 'function') ? Order : (mongoose.models.Order || mongoose.model('Order'))

        const userId = req.user && req.user._id

        let appliedVoucher = null
        if (voucherId) {
            const voucher = await Voucher.findById(voucherId)

            if (!voucher || voucher.isDeleted || !voucher.isActive) {
                return res.status(400).json({ success: false, message: 'Selected voucher is no longer available' })
            }

            const hasClaimed = (voucher.claimedBy || []).some((id) => String(id) === String(userId))
            if (!hasClaimed) {
                return res.status(400).json({ success: false, message: 'You have not claimed this voucher' })
            }

            const alreadyUsed = (voucher.usedBy || []).some((id) => String(id) === String(userId))
            if (alreadyUsed) {
                return res.status(400).json({ success: false, message: 'This voucher has already been used' })
            }

            appliedVoucher = voucher
        }

        const orderData = {
            orderItems,
            shippingInfo,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
            paymentInfo,
            paidAt: Date.now(),
            user: userId
        }

        let order
        if (OrderModel && typeof OrderModel.create === 'function') {
            order = await OrderModel.create(orderData)
        } else if (typeof OrderModel === 'function') {
            // Try to instantiate and save (fallback)
            const doc = new OrderModel(orderData)
            order = await doc.save()
        } else {
            throw new Error('Order model is not constructible')
        }

        if (appliedVoucher) {
            appliedVoucher.usedBy = [...(appliedVoucher.usedBy || []), userId]
            appliedVoucher.updatedAt = new Date()
            await appliedVoucher.save()
        }
        // send order confirmation email (non-blocking for response)
        (async () => {
        try {
            const itemsSummary = order.orderItems.map(i => `${i.name} x${i.quantity}`).join(', ');
            const message = `Hello ${req.user && req.user.name ? req.user.name : 'Customer'},<br/><br/>` +
                `Thank you for your order. Your order id is <strong>${order._id}</strong>.<br/>` +
                `Items: ${itemsSummary}<br/>` +
                `Total: $${order.totalPrice.toFixed(2)}<br/><br/>` +
                `We will notify you once your order ships.<br/><br/>Regards,<br/>DRIFTDASH `;

            await sendEmail({
                email: (req.user && req.user.email) || (req.body && req.body.email),
                subject: `Order Confirmation - ${order._id}`,
                message
            });
        } catch (err) {
            console.error('Order confirmation email failed:', err && err.message ? err.message : err);
        }
        })();

        // Notifications for user and admin
        notify({
            userId: req.user && req.user._id,
            role: 'user',
            title: 'Order placed',
            message: `Your order ${order._id} was placed successfully.`,
            type: 'order',
            refId: String(order._id),
            refModel: 'Order',
        })

        notify({
            userId: null,
            role: 'admin',
            title: 'New order',
            message: `New order ${order._id} from ${req.user && req.user.name ? req.user.name : 'customer'}.`,
            type: 'order',
            refId: String(order._id),
            refModel: 'Order',
        })

        return res.status(200).json({ success: true, order })
    } catch (err) {
        console.error('New order error:', err && err.stack ? err.stack : err)
        return res.status(500).json({ success: false, message: err && err.message ? err.message : 'Failed to create order' })
    }
}

exports.myOrders = async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id })
    // console.log(req.user)
    res.status(200).json({
        success: true,
        orders
    })
}

exports.getSingleOrder = async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email')
    if (!order) {
        res.status(404).json({
            message: 'No Order found with this ID',

        })
    }
    res.status(200).json({
        success: true,
        order
    })
}

exports.allOrders = async (req, res, next) => {
    const orders = await Order.find().populate('user', 'name email')
    // console.log(orders)
    let totalAmount = 0;

    orders.forEach(order => {

        totalAmount += order.totalPrice
    })

    res.status(200).json({
        success: true,
        totalAmount,
        orders
    })
}

exports.deleteOrder = async (req, res, next) => {
    const order = await Order.findByIdAndDelete(req.params.id)

    if (!order) {
        return res.status(400).json({
            message: 'No Order found with this ID',

        })
      
    }
    return res.status(200).json({
        success: true
    })
}

exports.updateOrder = async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const newStatus = req.body.status;
    // only updateDeliveredAt when transitioning to Delivered
    if (newStatus === 'Delivered' && order.orderStatus !== 'Delivered') {
        order.deliveredAt = Date.now();
    }

    // update stock only when the status moves from Processing to Shipped/Delivered
    const shouldAdjustStock =
        ['Shipped', 'Delivered'].includes(newStatus) &&
        !['Shipped', 'Delivered'].includes(order.orderStatus);

    if (shouldAdjustStock) {
        for (const item of order.orderItems) {
            // await inside loop so errors propagate
            await updateStock(item.product, item.quantity);
        }
    }

    order.orderStatus = newStatus;
    // if status is changed away from Delivered you might want to clear deliveredAt
    if (newStatus !== 'Delivered' && order.deliveredAt) {
        order.deliveredAt = undefined;
    }

    await order.save();

    notify({
        userId: order.user,
        role: 'user',
        title: 'Order updated',
        message: `Your order ${order._id} is now ${order.orderStatus}.`,
        type: 'order',
        refId: String(order._id),
        refModel: 'Order',
    });

    // Remote push (Expo push tokens)
    try {
        const u = await User.findById(order.user).select('expoPushToken');
        const token = u?.expoPushToken;
        if (token) {
            await sendExpoPush([token], {
                title: 'Order updated',
                body: `Your order ${order._id} is now ${order.orderStatus}.`,
                data: { refModel: 'Order', refId: String(order._id) },
            });
        }
    } catch (e) {
        console.error('[updateOrder] push failed', e?.message || e);
    }

    res.status(200).json({
        success: true,
        order,
    });
}

async function updateStock(id, quantity) {
    const product = await Product.findById(id);

    product.stock = product.stock - quantity;

    await product.save({ validateBeforeSave: false })
}

exports.totalOrders = async (req, res, next) => {
    const totalOrders = await Order.aggregate([
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ])
    if (!totalOrders) {
        return res.status(404).json({
            message: 'error total orders',
        })
    }
    res.status(200).json({
        success: true,
        totalOrders
    })

}

exports.totalSales = async (req, res, next) => {
    const totalSales = await Order.aggregate([
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" }
            }
        }
    ])
    if (!totalSales) {
        return res.status(404).json({
            message: 'error total sales',
        })
    }
    res.status(200).json({
        success: true,
        totalSales
    })
}

exports.customerSales = async (req, res, next) => {
    const customerSales = await Order.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            },
        },
        // {
        //     $group: {
        //         _id: "$user",
        //         total: { $sum: "$totalPrice" },
        //     }
        // },

        { $unwind: "$userDetails" },
        {
            $group: {
                _id: "$user",
                total: { $sum: "$totalPrice" },
                doc: { "$first": "$$ROOT" },

            }
        },

        {
            $replaceRoot: {
                newRoot: { $mergeObjects: [{ total: '$total' }, '$doc'] },
            },
        },
        // {
        //     $group: {
        //         _id: "$userDetails.name",
        //         total: { $sum: "$totalPrice" }
        //     }
        // },
        {
            $project: {
                _id: 0,
                "userDetails.name": 1,
                total: 1,
            }
        },
        { $sort: { total: -1 } },

    ])
    console.log(customerSales)
    if (!customerSales) {
        return res.status(404).json({
            message: 'error customer sales',
        })


    }
    // return console.log(customerSales)
    res.status(200).json({
        success: true,
        customerSales
    })

}

exports.salesPerMonth = async (req, res, next) => {
    const salesPerMonth = await Order.aggregate([

        {
            $group: {
                // _id: {month: { $month: "$paidAt" } },
                _id: {
                    year: { $year: "$paidAt" },
                    month: { $month: "$paidAt" }
                },
                total: { $sum: "$totalPrice" },
            },
        },

        {
            $addFields: {
                month: {
                    $let: {
                        vars: {
                            monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', ' Sept', 'Oct', 'Nov', 'Dec']
                        },
                        in: {
                            $arrayElemAt: ['$$monthsInString', "$_id.month"]
                        }
                    }
                }
            }
        },
        { $sort: { "_id.month": 1 } },
        {
            $project: {
                _id: 0,
                month: 1,
                total: 1,
            }
        }

    ])
    if (!salesPerMonth) {
        return res.status(404).json({
            message: 'error sales per month',
        })
    }
    // return console.log(customerSales)
    res.status(200).json({
        success: true,
        salesPerMonth
    })

}