const mongoose = require("mongoose")

const adminSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    brand: { type: String, required: true },
    dob: { type: Date, required: true},
    city: { type: String, required: true },
    postalAddress: { type: String, required: true },
})

const adminModel =mongoose.model("adminInfo",adminSchema,"adminInfo")

module.exports = adminModel