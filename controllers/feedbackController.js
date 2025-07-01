const Feedback = require("../models/feedback");

exports.submitFeedback = async (req, res) => {
  try {
    console.log("Incoming feedback data:", req.body); // Debug log

    const { name, email, type, message } = req.body;

    // Validation
    if (!name || !email || !type || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Save feedback
    const feedback = new Feedback({ name, email, type, message });
    await feedback.save();

    // Success response
    res.status(201).json({ msg: "Feedback received successfully." });
  } catch (err) {
    console.error("Feedback submission error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
