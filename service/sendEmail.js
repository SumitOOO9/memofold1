const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationCode = async (email, code) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MemoFold <support@memofold.com>',
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <h2>Password Reset Verification Code</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>Enter this code to reset your password. This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    if (error) {
      console.error('Email sending error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
};

module.exports = { sendVerificationCode };
