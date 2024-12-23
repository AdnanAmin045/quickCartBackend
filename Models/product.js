
const mongoose = require("mongoose")

const productItemsSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    img: {
        url: { type: String, required: true },
        key: { type: String, required: true },
    },
    description: { type: String, required: true },
    status: { type: String, required: true },
    previousPrice: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    productCost: { type: Number, required: true },
    discount: { type: Number, required: true },
    category: { type: String, required: true },
    tags: { type: [String], required: true },
    productquantity: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now }
})


const productModel = mongoose.model("productData", productItemsSchema, "productData")

module.exports = productModel