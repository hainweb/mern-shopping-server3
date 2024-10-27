const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const session = require('express-session');

// Route imports
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const deliverRouter = require('./routes/delivery');
const superAdminRouter = require('./routes/superAdmin');

// Database configuration
const db = require('./config/connection');

const app = express();

// Security Enhancements
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Compression middleware
app.use(compression());

// CORS configuration with specific origin
app.use(cors({
  origin: 'https://kingshopping.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // CORS preflight cache for 24 hours
}));

// View engine setup with caching
const hbsInstance = hbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    lt: (v1, v2) => v1 < v2,
    eq: (v1, v2) => v1 === v2,
    multiply: (v1, v2) => v1 * v2
  },
  cache: true // Enable template caching
});

app.engine('hbs', hbsInstance.engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware optimization
app.use(logger('dev', {
  skip: (req, res) => res.statusCode < 400 // Log only errors
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// File upload configuration with limits
app.use(fileUpload({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5 // Max number of files
  },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: false
}));

// Session configuration with optimized MongoDB store
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'ajinajinshoppingsecretisajin',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://ajinrajeshhillten:5PeT8NxReh3zCwou@shoppingcart.jv3gz.mongodb.net/?retryWrites=true&w=majority&appName=ShoppingCart',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 24 * 3600,
    stringify: false // Disable JSON stringification for better performance
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  name: 'sessionId' // Custom session cookie name
};

app.set('trust proxy', 1);
app.use(session(sessionConfig));

// Static file serving with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Database connection with retry mechanism
const connectWithRetry = async () => {
  try {
    await db.connect();
    console.log('Database Connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/delivery', deliverRouter);
app.use('/superAdmin', superAdminRouter);



// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

module.exports = app;
