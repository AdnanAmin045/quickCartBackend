const express = require("express")
const router = express.Router();
const mongoose = require('mongoose')

const wishlistModel = require('../Models/wishlist');



// Get Data


router.get("/", async (req, res) => {
    const { userId } = req.query;
    const userIdObject = new mongoose.Types.ObjectId(userId);
    try {
        const product = await wishlistModel.aggregate([
            {
                $match: { userId: userIdObject }
            },
            {
                $lookup: {
                    from: 'productData',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            }
        ])
        res.json(product)
    } catch (err) {
        console.error("Error Message in catch block: ", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


// Add to Wishlist

router.post("/add", async (req, res) => {
    const { productId, userId } = req.body
    const duplicate = await wishlistModel.findOne({ productId, userId })
    try {
        if (duplicate) {
            res.status(400).json({ message: "Product Already added to cart" });
        }
        else {
            const newId = new wishlistModel({ userId, productId, addedDate: new Date() })
            await newId.save()
            res.status(200).json({ message: "Product added to cart" });
        }
    }
    catch (err) {
        console.log("Error occurred:", err);
    }

})


// Delete Data from the Wishlist 

router.delete("/delete", async (req, res) => {
    const { productId, userId } = req.body
    const userIdObject = new mongoose.Types.ObjectId(userId)
    try {
        const response = await wishlistModel.deleteOne(
            { productId: productId, userId: userIdObject }
        )
        if (response.deletedCount >= 1) {
            res.status(200).json({ message: "Product has been removed" });
        }
        else {
            res.status(400).json({ message: "Error in removing from Wishlist" })
        }
    }
    catch (err) {
        console.error("Error Message in catch block: ", err);
        res.status(500).json({ message: "Internal server error" });
    }
})

// Remove all Product

router.delete("/removeAll", async (req, res) => {
    const { userId } = req.body
    const userIdObject = new mongoose.Types.ObjectId(userId)
    try {
        const response = await wishlistModel.deleteMany({ userId: userIdObject });
        res.status(200).json({ message: "All products removed from wishlist", deletedCount: response.deletedCount });
    } catch (error) {
        res.status(500).json({ message: "Error deleting products from wishlist", error: error.message });
    }
})


module.exports = router