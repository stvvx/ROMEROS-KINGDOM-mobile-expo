const express = require('express');
const app = express();
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path');

const products = require('./routes/product');
const auth = require('./routes/auth');
const order = require('./routes/order');
const categories = require('./routes/category');
const notifications = require('./routes/notification');
const vouchers = require('./routes/voucher');

app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit: "50mb", extended: true }));
app.use(cors());
app.use(cookieParser());

// Lightweight liveness endpoints for clients and hosting health checks.
app.get('/', (req, res) => {
	res.status(200).json({ success: true, message: 'ROMEROS backend is running' });
});

app.get('/api/v1', (req, res) => {
	res.status(200).json({ success: true, message: 'ROMEROS API v1 online' });
});

app.get('/api/v1/health', (req, res) => {
	res.status(200).json({ success: true, status: 'ok' });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1', products);
app.use('/api/v1', auth);
app.use('/api/v1', order);
app.use('/api/v1', categories);
app.use('/api/v1', notifications);
app.use('/api/v1', vouchers);

// Generic error handler — return JSON instead of HTML stack traces
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err && err.stack ? err.stack : err);
	const status = err.status || 500;
	res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
});






module.exports = app