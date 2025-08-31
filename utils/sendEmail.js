const nodemailer = require("nodemailer");

const sendVerificationCode = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const message = `
      <h2>Password Reset Verification Code</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>Enter this code to reset your password. This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Verification Code',
      html: message
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

module.exports = { sendVerificationCode };