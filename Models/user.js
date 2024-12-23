
const mongoose = require("mongoose")

const userSignUpSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    countryCode: { type: String, required: true },
    contactNo: { type: String, required: true },
    countryName: {
        type: String,
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
    status: { type: Number, required: true }
});
const userModel = mongoose.model("user", userSignUpSchema, "user")

module.exports = userModel