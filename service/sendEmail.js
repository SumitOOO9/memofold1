const nodemailer = require("nodemailer");

const sendVerificationCode = async (email, code) => {
  try {
    // Better Gmail configuration for production
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // Important for some production environments
      }
    });

    // Verify connection configuration
    await transporter.verify();
    console.log('SMTP connection verified');

    const message = `
      <h2>Password Reset Verification Code</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>Enter this code to reset your password. This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const mailOptions = {
      from: `"Testing" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code',
      html: message,
      // Add text version for better deliverability
      text: `Your password reset verification code is: ${code}. This code will expire in 10 minutes.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
    
  } catch (error) {
    console.error('Email sending error details:', error);
    return false;
  }
};

module.exports = { sendVerificationCode };