const mongoose = require("mongoose")

const billingAddressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    optionalAddress: { type: String },
    phoneNo: { type: String, required: true },
    email: { type: String, required: true },
    optionalNote: { type: String },
    cardNo: { type: String },
    cvc: { type: Number },
    expiryDate: { type: String },
    postalCode:{type:Number, required:true}
})


const billingAddressModel = mongoose.model("billingAddress", billingAddressSchema, "billingAddress")


module.exports = billingAddressModel