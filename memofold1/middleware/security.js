// security.js
const helmet = require('helmet');
const cors = require('cors');

function securityMiddleware(app) {
  app.use(helmet());

  // Allow all origins
  app.use(cors({
    origin: true, // or use '*' but true is better for credentials
    credentials: true,
  }));
}

module.exports = securityMiddleware;
