require("dotenv").config();
const nodemailer = require("nodemailer");

module.exports = async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",  // ✅ use Gmail preset
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"MemoFold" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
};