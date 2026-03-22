const cloudinary = require('cloudinary').v2

const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_NAME ||
    process.env.CLOUD_NAME

const apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_KEY

const apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_SECRET

const cloudinaryUrl = process.env.CLOUDINARY_URL

const isConfigured = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret))

if (isConfigured) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        cloudinary_url: cloudinaryUrl,
    })
    console.log('Cloudinary configured with cloud_name:', cloudName || '[from CLOUDINARY_URL]')
} else {
    console.warn('[cloudinary] Missing configuration. Avatar uploads will fall back to local storage.')
}

cloudinary.isConfigured = isConfigured

module.exports = cloudinary