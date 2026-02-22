const express = require('express');
const app = express();
const cors = require('cors')
const cookieParser = require('cookie-parser')

const products = require('./routes/product');
const auth = require('./routes/auth');
const order = require('./routes/order');

app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit: "50mb", extended: true }));
app.use(cors());
app.use(cookieParser());

app.use('/api/v1', products);
app.use('/api/v1', auth);
app.use('/api/v1', order);

// Generic error handler — return JSON instead of HTML stack traces
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err && err.stack ? err.stack : err);
	const status = err.status || 500;
	res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
});






module.exports = app