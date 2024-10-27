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

const connect = () => {
  return client.connect()
    .then(() => {
      console.log('Database Connected Successfully');
      return client; // Return client if needed
    })
    .catch((err) => {
      console.error('Database connection error:', err);
      throw err; // Re-throw to handle in app.js
    });
};


module.exports = { connect, client };
