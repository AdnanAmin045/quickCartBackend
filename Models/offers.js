const mongoose = require("mongoose")

const offersSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    fromDate: { type: Date, required: true},
    toDate: { type: Date, required: true},
    discount: { type: Number, required: true},
    addedAt: { type: Date, default: Date.now },
})

const offersModel =mongoose.model("offersDetail",offersSchema,"offersDetail")

module.exports = offersModel