// config/connection.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://ajinrajeshhillten:5PeT8NxReh3zCwou@shoppingcart.jv3gz.mongodb.net/?retryWrites=true&w=majority&appName=ShoppingCart';
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

const connect = (callback) => {
  client.connect()
    .then(() => {
      console.log('Database Connected Successfully');
      if (callback) callback(null, client);
    })
    .catch((err) => {
      console.error('Database connection error:', err);
      if (callback) callback(err);
    });
};

module.exports = { connect, client };
