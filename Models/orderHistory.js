const mongoose = require("mongoose")

const productInfoSchema = new mongoose.Schema({
    productID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'productData' },
    productTitle: { type: String, required: true },
    quantity: { type: Number, required: true },
    productPrice: { type: Number, required: true }
});


const orderHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    productInfo: {
        type: [productInfoSchema], required: true
    },
    orderAt: { type: Date, default: Date.now },
    paymentStatus:{type: String,required: true},
    deliveryStatus:{type:Number,required:true, default:1}
})


const orderHistoryModel = mongoose.model("orderHistory", orderHistorySchema, "orderHistory")


module.exports = orderHistoryModel