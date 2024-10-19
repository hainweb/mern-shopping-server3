var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const { ObjectId } = require('mongodb');
const { response } = require('../app');
var adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');

const verifyLogin = (req, res, next) => {
  if (req.session.adminsec) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}
/* GET users listing. */
router.get('/', verifyLogin, async function (req, res, next) {

  const products = await productHelpers.getAllProducts();
  for (let product of products) {
    product.ordercount = await productHelpers.getOrdersCount(product._id);
  }
  console.log(req.session.adminsec);

  res.render('admin/view-products', { admin: true, products, adminsec: req.session.adminsec });
});

router.get('/login', (req, res) => {
  if (req.session.adminloggedIn) {
    res.redirect('/admin')
  } else {
    res.render('admin/login', { admin: true, "info": req.session.adminloginErr })
    req.session.admininfo = false
  }

})
router.post('/login', (req, res) => {
  adminHelpers.doadminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminloggedIn = true
      req.session.adminsec = response.admin
      res.redirect('/admin')
    } else {
      req.session.adminloginErr = "Invalid username or password"
      res.redirect('/admin/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.adminsec = null
  req.session.adminloggedIn=false
  res.render('admin/login', { admin: true })
})
router.get('/add-products', verifyLogin, (req, res) => {
  res.render('admin/add-products', { admin: true, adminsec: req.session.adminsec })
})
router.post('/add-product', verifyLogin, (req, res) => {

  productHelpers.addProduct(req.body, (ObjectId) => {
    let image = req.files.image
    image.mv('./public/product-images/' + ObjectId + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-products',{admin:true,adminsec:req.session.adminsec})
      } else {
        console.log(err)       
      }
    })

  })

})
router.get('/delete-item/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
  })

})
router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  var product = await productHelpers.getProductsDetails(req.params.id)
  console.log(product);


  res.render('admin/edit-products', { product, admin: true, adminsec: req.session.adminsec })

})
router.post('/edit-product/:id', verifyLogin, (req, res) => {
  let id = req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {

    if (req.files && req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + id + '.jpg')
    }
    res.redirect('/admin/')
  })

})
router.get('/all-users', verifyLogin, async (req, res) => {
  let allUsers = await adminHelpers.getAllUsers()
  console.log("all users are ", allUsers);
  res.render('admin/all-users', { admin: true, adminsec: req.session.adminsec, allUsers })


})
router.get('/allUsers-Orders/:id', verifyLogin, async (req, res) => {
  req.params.id
  console.log("id is ", req.params.id);
  let orders = await userHelpers.getOrders(req.params.id)
  console.log("ordered products are ", orders);
  res.render('admin/users-orders', { orders, admin: true, adminsec: req.session.adminsec })
})
router.get('/user-ordered-products/:id', verifyLogin, async (req, res) => {
  req.params.id
  console.log("id is ", req.params.id);
  let products = await userHelpers.getOrderedProducts(req.params.id)
  console.log("products are ", products);
  res.render('admin/view-ordered-products', { products, admin: true, adminsec: req.session.adminsec })
})
module.exports = router;
