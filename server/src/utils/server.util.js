const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const timeout = require('connect-timeout');
const routes = require('../route/routes');

const createServer = () => {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(cors());
  app.use(session({ secret: 'not a secret', resave: true, saveUninitialized: true }));
  app.use(timeout(3000));

  routes(app);

  return app;
};

module.exports = createServer;
