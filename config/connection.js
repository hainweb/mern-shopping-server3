// config/connection.js
const mongoose = require('mongoose');

const connect = (callback) => {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ajinrajeshhillten:5PeT8NxReh3zCwou@shoppingcart.jv3gz.mongodb.net/?retryWrites=true&w=majority&appName=ShoppingCart', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
  .then(() => {
    console.log('Database Connected Successfully');
    if (callback) callback(null);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    if (callback) callback(err);
  });
};

module.exports = { connect };

// In app.js
db.connect((err) => {
  if (err) {
    console.log('Database connection failed:', err);
  } else {
    console.log('Database Connected Successfully');
  }
});
