const {Redis} = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = {
  async get(key) {
    return await redis.get(key);
  },
  async set(key, value, ttl = 3600) {
    return await redis.set(key, value, { ex: ttl });
  },
  async del(key) {
    return await redis.del(key);
  },
};
