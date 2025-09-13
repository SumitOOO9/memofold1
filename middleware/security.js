// security.js
const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss-clean');
// const rateLimit = require('express-rate-limit');
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://memofold-coral.vercel.app',
  'https://www.memofold.com',
];


function securityMiddleware(app) {
  app.use(helmet());

//   app.use(mongoSanitize());

//   app.use(xss());

  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   max: 200,
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });
  // app.use(limiter);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn('❌ Blocked by CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
}

module.exports = securityMiddleware;
