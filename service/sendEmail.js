const nodemailer = require("nodemailer");

const sendVerificationCode = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection first
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const message = `
      <h2>Password Reset Verification Code</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>Enter this code to reset your password. This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code',
      html: message,
      text: `Your password reset verification code is: ${code}. This code will expire in 10 minutes.`
    };

    console.log('Sending email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully. Message ID:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('=== EMAIL ERROR DETAILS ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Stack trace:', error.stack);
    console.error('=== END EMAIL ERROR ===');
    
    return {
      success: false,
      error: error
    };
  }
};

module.exports = { sendVerificationCode };