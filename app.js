var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const MongoStore = require('connect-mongo');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var deliverRouter = require('./routes/delivery');
var superAdminRouter = require('./routes/superAdmin');

var hbs = require('express-handlebars');
var app = express();
var fileUpload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session'); 

// CORS Middleware should be placed before route definitions 
app.use(cors({
  origin: 'https://mern-shopping-client.onrender.com', // Allow frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Fixed typo from 'Contend-Type' to 'Content-Type'
  credentials: true // Allow credentials (cookies/sessions)
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/',
  helpers: {
    lt: function (v1, v2) {
      return v1 < v2;
    },
    eq: function (v1, v2) {
      return v1 === v2;
    },
    multiply: function (v1, v2) {
      return v1 * v2;
    }
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.use(session({
  secret: 'ajinajinshoppingsecretisajin',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://ajinrajeshhillten:5PeT8NxReh3zCwou@shoppingcart.jv3gz.mongodb.net/?retryWrites=true&w=majority&appName=ShoppingCart',
    collectionName: 'sessions'
  }),
  cookie: {
    secure: true, // true in production
    httpOnly: true,
    sameSite: 'none',  // required for cross-origin cookies
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Database connection
db.connect((err) => {
  if (err) {
    console.log('Database not connected' + err);
  } else {
    console.log('Database Connected ');
  }
});

// Route handling
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/delivery', deliverRouter);
app.use('/superAdmin', superAdminRouter);

// Static public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
