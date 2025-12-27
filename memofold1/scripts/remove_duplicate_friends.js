const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const FriendList = require('../models/friendList');

async function dedupeFriendsArray(friends) {
  const map = new Map();
  for (const f of friends || []) {
    const key = f._id ? String(f._id) : JSON.stringify(f);
    if (!map.has(key)) map.set(key, f);
    else {
      const existing = map.get(key);
      if (f.addedAt && existing.addedAt) {
        if (new Date(f.addedAt) < new Date(existing.addedAt)) map.set(key, f);
      }
    }
  }
  return Array.from(map.values());
}

async function mergeDuplicateUserDocs() {
  const groups = await FriendList.aggregate([
    { $group: { _id: '$user', ids: { $push: '$_id' }, friendsArrays: { $push: '$friends' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  let mergedDocs = 0;
  for (const g of groups) {
    const ids = g.ids.map(id => String(id));
    const allFriends = [];
    for (const arr of g.friendsArrays) if (Array.isArray(arr)) allFriends.push(...arr);

    const mergedFriends = await dedupeFriendsArray(allFriends);

    const keepId = ids[0];
    const removeIds = ids.slice(1);

    await FriendList.findByIdAndUpdate(keepId, { friends: mergedFriends }, { new: true });
    await FriendList.deleteMany({ _id: { $in: removeIds } });
    mergedDocs += removeIds.length;
    console.log(`Merged ${removeIds.length} duplicate docs for user ${g._id}`);
  }
  return mergedDocs;
}

async function dedupeAllDocsFriendsArray() {
  const cursor = FriendList.find().cursor();
  let updated = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const deduped = await dedupeFriendsArray(doc.friends);
    if (deduped.length !== (doc.friends || []).length) {
      await FriendList.findByIdAndUpdate(doc._id, { friends: deduped });
      updated++;
      console.log(`Dedupe inside doc ${doc._id} (user ${doc.user}) -> ${deduped.length} friends`);
    }
  }
  return updated;
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env; aborting');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    console.log('Connected to MongoDB — starting dedup');
    const merged = await mergeDuplicateUserDocs();
    const updated = await dedupeAllDocsFriendsArray();
    console.log(`Done. Merged duplicate docs: ${merged}. Updated docs with deduped arrays: ${updated}`);
  } catch (err) {
    console.error('Error during dedup:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) run();
