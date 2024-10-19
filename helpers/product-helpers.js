var db = require('../config/connection')
var collection = require('../config/collection')

const { ObjectId } = require('mongodb')
const { get, response } = require('../app')
module.exports = {

    addProduct: (product, callback) => {

        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {


            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) }).then((response) => {
                console.log(response);

                resolve(response)
            })
        })
    },
    getProductsDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:new ObjectId(proId)},{
        $set:{
            Name:proDetails.Name,
            Price:proDetails.Price,
            Category:proDetails.Category,
            Description:proDetails.Description,
            Quantity:proDetails.Quantity
        }
    }).then((response)=>{
        resolve()
    })
        })
    },
    getOrdersCount: (proId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let result = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    { $match: { 'products.item': new ObjectId(proId) } }, // Match the specific product
                    { $unwind: '$products' }, // Deconstruct the products array
                    { $match: { 'products.item': new ObjectId(proId) } }, // Match again after unwind
                    { $group: { _id: null, totalQuantity: { $sum: '$products.quantity' } } } // Sum the quantity
                ]).toArray();
    
                let totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
                resolve(totalQuantity);
            } catch (error) {
                reject(error);
            }
        });
    }
}