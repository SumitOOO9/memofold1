const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const sendFeedbackEmail = async ({
  name,
  email,
  requestType,
  message,
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Feedback Form <support@memofold.com>",
      to: "memofold@gmail.com", 
      reply_to: email,
      subject: "📩 New Feedback Received – MemoFold",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color:#4f46e5;">New Feedback Submitted</h2>

          <table cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td><strong>Name:</strong></td>
              <td>${name || "Anonymous"}</td>
            </tr>
            <tr>
              <td><strong>Email:</strong></td>
              <td>${email || "Not provided"}</td>
            </tr>
            <tr>
              <td><strong>requestType:</strong></td>
              <td>${requestType || "N/A"}</td>
            </tr>
          </table>

          <h3 style="margin-top:20px;">Message</h3>
          <p style="background:#f9fafb;padding:12px;border-radius:6px;">
            ${message}
          </p>

          <hr />
         
        </div>
      `,
    });

    if (error) {
      console.error("Feedback email error:", error);
      return false;
    }

    console.log("Feedback email sent:", data);
    return true;
  } catch (err) {
    console.error("Unexpected feedback email error:", err);
    return false;
  }
};

module.exports = { sendFeedbackEmail };
