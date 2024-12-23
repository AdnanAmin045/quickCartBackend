const  mongoose = require("mongoose");

const countryDataSchema = new mongoose.Schema({
    flag: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
});


const countryModel = mongoose.model("countryData",countryDataSchema,"countryData")
module.exports = countryModel