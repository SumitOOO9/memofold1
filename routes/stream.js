// routes/stream.js
const express = require('express');
const router = express.Router();
const { syncAllProfilePics } = require('../controllers/streamController');

const { authenticate } = require('../middleware/authMiddleware');

// POST /api/stream/sync-profile-pics
router.post('/sync-profile-pics', authenticate, syncAllProfilePics);
module.exports = router;
