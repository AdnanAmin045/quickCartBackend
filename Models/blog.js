const mongoose = require("mongoose")

const blogSchema = new mongoose.Schema({
    img: { type: String, required: true },
    description: { type: String, required: true },
    title: { type: String, required: true },
    pubishedAt: { type: Date, default: Date.now }
})


const blogModel = mongoose.model("blogData",blogSchema,"blogData")

module.exports = blogModel