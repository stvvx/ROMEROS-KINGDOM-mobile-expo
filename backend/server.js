// ⚠️  dotenv MUST load before any config that reads process.env
const dotenv = require('dotenv');
dotenv.config({path: './config/.env'})

const app = require('./app');
const connectDatabase = require('./config/database')

connectDatabase();

// Cloudinary is configured in config/cloudinary.js if needed
// But frontend now uploads directly to Cloudinary, so backend doesn't need it

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