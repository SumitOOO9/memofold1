const { sendFeedbackEmail } = require("../utils/sendFeedbackEmail");

exports.submitFeedback = async (req, res) => {
  try {
    const { name, email, message, requestType } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Feedback message is required",
      });
    }

    const success = await sendFeedbackEmail({
      name,
      email,
      message,
      requestType,
    });

    if (!success) {
      return res.status(500).json({
        error: "Failed to send feedback",
      });
    }

    res.status(200).json({
      message: "Thank you for your feedback 🙌",
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    res.status(500).json({
      error: "Server error while submitting feedback",
    });
  }
};
