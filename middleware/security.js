// security.js
const helmet = require('helmet');
const cors = require('cors');

function securityMiddleware(app) {
  app.use(helmet());

  app.use(
    cors({
      origin: '*', // ✅ allow all origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
}

module.exports = securityMiddleware;
