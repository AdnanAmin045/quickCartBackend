const mongoose = require("mongoose")

const wishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    addedDate: { type: Date, required: true }
})


const wishlistModel = mongoose.model("wishList",wishlistSchema,"wishlist")

module.exports = wishlistModel;


