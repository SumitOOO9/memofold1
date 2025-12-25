const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("PUBLIC KEY:\n", vapidKeys.publicKey);
console.log("PRIVATE KEY:\n", vapidKeys.privateKey);
