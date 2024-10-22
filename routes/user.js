var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');
const { response, render } = require('../app');

const verifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    next();
  } else {
  res.json({status:false})
  }
};

const verifySession = (req, res, next) => {
  console.log('Verifying session:', req.session?.id);
  console.log('Session user:', req.session?.user);
  
  if (req.session && req.session.user && req.session.user.loggedIn) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};
/* GET home page. */

// Updated login route with better session handling
router.post('/api/login', async (req, res) => {
  try {
    console.log('Login request from React:', req.body);
    const response = await userHelpers.doLogin(req.body);
    
    if (response.status) {
      // Set session data
      req.session.user = {
        loggedIn: true,
        _id: response.user._id,
        Name: response.user.Name,
        Mobile: response.user.Mobile
      }; // Don't store password in session
      
      // Save session explicitly
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve();
        });
      });
      
      console.log('Session saved:', req.session.user);
      res.json({ loggedIn: true, user: req.session.user });
    } else {
      res.json({ loggedIn: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Updated products route with session verification
router.get('/api/products', async (req, res) => {
  try {
    console.log('Session check in products:', req.session?.id);
    console.log('User in session:', req.session?.user);

    if (!req.session) {
      console.error('No session object found');
      return res.status(500).json({ error: 'Session not initialized' });
    }

    const user = req.session.user;
    let cartCount = null;
    let products = await productHelpers.getAllProducts();

    if (user && user.loggedIn) {
      console.log('Logged in user accessing products:', user._id);
      cartCount = await userHelpers.getCartCount(user._id);
      const wishlist = await userHelpers.getWishlist(user._id);
      
      // Add wishlist status to products
      products = products.map(product => ({
        ...product,
        isInWishlist: wishlist.products.some(item => 
          item.item.toString() === product._id.toString()
        )
      }));

      res.json({ products, user, cartCount });
    } else {
      console.log('No user in session, sending products only');
      res.json({ products });
    }
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add a session check middleware for protected routes




router.get('/api/login', (req, res) => {
  console.log('Session User:', req.session.user); // Log session user data for debugging
  if (req.session.user && req.session.user.loggedIn) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false, message: req.session.info });
    req.session.info = false;
  }
});



router.get('/api/signup', (req, res) => {

  res.json({ "info": req.session.signupErr })
  req.session.info = false
})
router.post('/api/signup', (req, res) => {
  console.log('api call signup');
  
  userHelpers.doSignup(req.body).then((response1) => {
    if (response1.status) {
      req.session.user = { loggedIn: true, ...response1.user };
      res.json({status:true});
    } else {
      req.session.signupErr = 'This number is already taken';
      res.json({status:false});
    }
  });
});



router.get('/api/logout', (req, res) => {
  console.log('api call');
  
  req.session.user=null
  res.json({logout:true})
})
router.get('/api/cart', verifyLogin, async (req, res) => {
  let  username = req.session.user
  let user=req.session.user._id
  
  
  let cartCount = null
  if (req.session.user) {

    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let products = await userHelpers.getCartProducts(req.session.user._id);
 
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.json( { products, user, total, cartCount, username }); // Pass the product details to the cart template

}); 

 
router.get('/api/add-to-cart/:id', verifyLogin, (req, res) => {
  console.log('api call done');

  let proId = req.params.id
  let userId = req.session.user._id
  userHelpers.addToCart(proId, userId).then(() => {
    res.json({ status: true })

  })
})
router.post('/api/change-productQuantity', (req, res) => {
  console.log('api call qq',req.body);

  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})
router.get('/api/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.json({ user: req.session.user, total })
})
router.post('/api/place-order',verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user._id)
  let totalPrice = await userHelpers.getTotalAmount(req.session.user._id)
  let user = req.session.user._id
console.log('api call place',req.body);

  userHelpers.addOrders(req.body, products, totalPrice).then((response) => {
    res.json({ status: true })
  })


})
router.get('/order-success', verifyLogin, (req, res) => {
  res.json('user/order-success')
})
router.get('/api/view-orders', verifyLogin, async (req, res) => {
console.log('api call order');

  let orders = await userHelpers.getOrders(req.session.user._id)
  res.json({ user: req.session.user, orders })
})
router.get('/api/view-orders-products/:Id', verifyLogin, async (req, res) => {
  let orderId = req.params.Id
  let products = await userHelpers.getOrderedProducts(orderId)
  let ordertrack = await userHelpers.getTrackOrders(req.params.Id)
  console.log(orderId);
  console.log("products is ",products);
  console.log("Ordertrack is",ordertrack);
  
  res.json( { user: req.session.user, products,ordertrack })
})
router.get('/api/wishlist', verifyLogin,async(req,res)=>{
 let wishlistItems=await userHelpers.getWishlistProducts(req.session.user._id)
 console.log("resolve",wishlistItems);
 
  res.json({user:req.session.user,wishlistItems})
})
router.get('/api/add-to-Wishlist/:id',verifyLogin,(req,res)=>{
  console.log("wish id is ",req.params.id);
  userHelpers.addToWishlist(req.params.id,req.session.user._id).then(()=>{
    res.json({ status: true, message: 'Wishlist updated' });
  })
})

router.get('/api/dummyAddToCart',(req,res)=>{
  res.status(200).send({success:true})
})
module.exports = router;
