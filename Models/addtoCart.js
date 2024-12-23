const mongoose = require("mongoose")

const addtoCartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    addedDate: { type: Date, required: true },
    quantity: { type: Number, required: true }
})

const addtoCartModel = mongoose.model("addtoCart",addtoCartSchema,"addtoCart")


module.exports = addtoCartModel