const app = require('./app');
const connectDatabase = require('./config/database')
const cloudinary = require('cloudinary');

const dotenv = require('dotenv');
dotenv.config({path: './config/.env'})

connectDatabase();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const HOST = process.env.HOST || '0.0.0.0';

app.listen(process.env.PORT, HOST, () => {
    console.log(`server started on ${HOST}:${process.env.PORT} in ${process.env.NODE_ENV} mode`);
    // Prefer NGROK_URL when provided for external tunneling
    if (process.env.NGROK_URL) {
        console.log(`public API url (ngrok): ${process.env.NGROK_URL}`);
    } else if (process.env.PUBLIC_API_URL) {
        console.log(`public API url: ${process.env.PUBLIC_API_URL}`);
    }
});