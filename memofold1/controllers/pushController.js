const PushSubscription = require("../models/PushSubscription");

exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription)
      return res.status(400).json({ success: false });

    await PushSubscription.findOneAndUpdate(
      { userId: req.user.id },
      { subscription },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
