const nodemailer = require('nodemailer');

const sendEmail = async options => {
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
    const port = parseInt(process.env.SMTP_PORT, 10) || 2525;
    const secure = (process.env.SMTP_SECURE === 'true') || (port === 465);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            // allow self-signed certs (useful for some mailtrap setups)
            rejectUnauthorized: false
        }
    });

    const message = {
        from: `${process.env.SMTP_FROM_NAME || 'ROMEROS'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: `<p>${options.message}</p>`
    };

    try {
        await transporter.sendMail(message);
    } catch (err) {
        // Log error but don't crash the app
        console.error('Email send failed:', err && err.message ? err.message : err);
        throw err;
    }
};

module.exports = sendEmail;