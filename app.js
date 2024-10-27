// Required dependencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Route imports
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const deliverRouter = require('./routes/delivery');
const superAdminRouter = require('./routes/superAdmin');
const db = require('./config/connection');

// Initialize express
const app = express();

// Logger setup
const customLogger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Memory cache setup
const mcache = require('memory-cache');
const cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);

    if (cachedBody) {
      return res.send(cachedBody);
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

// CORS configuration
app.use(cors({
  origin: 'https://kingshopping.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Security and optimization middleware
app.use(helmet());
app.use(compression());
app.use(limiter);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    lt: (v1, v2) => v1 < v2,
    eq: (v1, v2) => v1 === v2,
    multiply: (v1, v2) => v1 * v2
  }
}));

// Standard middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'ajinajinshoppingsecretisajin',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://ajinrajeshhillten:5PeT8NxReh3zCwou@shoppingcart.jv3gz.mongodb.net/?retryWrites=true&w=majority&appName=ShoppingCart',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600,
    mongoOptions: {
      useUnifiedTopology: true
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

app.set('trust proxy', 1);
app.use(session(sessionConfig));

// Static file serving with cache
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Database connection
db.connect()
  .then(() => {
    customLogger.info('Database connected successfully');
  })
  .catch(err => {
    customLogger.error('Database connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/', cache(300), userRouter);
app.use('/admin', adminRouter);
app.use('/delivery', deliverRouter);
app.use('/superAdmin', superAdminRouter);

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  customLogger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date()
  });

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  customLogger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    customLogger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
