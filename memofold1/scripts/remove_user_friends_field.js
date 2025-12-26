require('dotenv').config();
const connectDb = require('../config/db');
const mongoose = require('mongoose');

async function run() {
  try {
    await connectDb();
    const User = require('../models/user');
    console.log('Removing `friends` field from all users...');
    const res = await User.updateMany({}, { $unset: { friends: "" } });
    console.log('Update result:', res.result || res);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error removing friends field:', err);
    process.exit(1);
  }
}

run();
