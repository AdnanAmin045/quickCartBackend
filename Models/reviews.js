const mongoose = require("mongoose")

const reviewsSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true },
    review: { type: String, required: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'productData' }]
})


const reviewsModel = mongoose.model("reviews", reviewsSchema, "reviews")


module.exports = reviewsModel