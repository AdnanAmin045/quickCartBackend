const mongoose = require('mongoose');
const express = require("express");
const router = express.Router();


const addtoCartModel = require("../Models/addtoCart")
const wishlistModel = require('../Models/wishlist')
const productModel = require('../Models/product')


// Get Data

router.get("/", async (req, res) => {
    const { userId } = req.query
    const userIdObject = new mongoose.Types.ObjectId(userId)
    try {
        const addtoCartData = await addtoCartModel.aggregate([
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
        ]);
        res.json(addtoCartData);
    } catch (error) {
        console.error('Error fetching cart with product details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Add one Product

router.post("/add", async (req, res) => {
    const { productId, userId } = req.body
    const userIdObject = new mongoose.Types.ObjectId(userId)
    const duplicate = await addtoCartModel.findOne({ productId: productId, userId: userIdObject })
    try {
        if (duplicate) {
            res.status(400).json({ message: "Product Already added to cart" });
        }
        else {
            const newId = new addtoCartModel({ userId: userIdObject, productId, addedDate: new Date(), quantity: 1 })
            await newId.save()
            res.status(200).json({ message: "Product added to cart" });
        }
    }
    catch (err) {
        console.log("Error occurred:", err);
    }
});



// Add ALl

router.post("/addAll", async (req, res) => {
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    const userIdObject = new mongoose.Types.ObjectId(userId);
    try {
        const wishlistItems = await wishlistModel.find({ userId: userIdObject });

        for (const item of wishlistItems) {
            const { productId } = item;
            const existingCartItem = await addtoCartModel.findOne({ productId: productId, userId: userIdObject });

            if (!existingCartItem) {
                const newCartItem = new addtoCartModel({
                    userId: userIdObject,
                    productId,
                    addedDate: new Date(),
                    quantity: 1
                });
                await newCartItem.save();
            }
        }

        res.status(200).json({ message: "Products added to cart" });
    } catch (err) {
        console.error("Error Message in catch block: ", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


// update Data

router.patch("/update", async (req, res) => {
    const { productId, quantity, flag, userId } = req.body;
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const productIdObject = new mongoose.Types.ObjectId(productId);
    let newQuantity = quantity;

    if (flag === 0) {
        newQuantity--;
    } else if (flag === 1) {
        newQuantity++;
    }

    try {
        const productResponse = await productModel.findOne({ _id: productIdObject });
        if (productResponse && (productResponse.productquantity >= (newQuantity))) {
            const response = await addtoCartModel.updateOne(
                { productId: productIdObject, userId: userIdObject },
                {
                    $set: { quantity: newQuantity }
                }
            );
            if (response.modifiedCount >= 1) {
                return res.status(200).json({
                    message: "Quantity has been changed",
                    newQuantity: newQuantity
                });
            } else {
                return res.status(400).json({ message: "Product not found" });
            }

        } else {
            return res.status(500).json({ message: "Failed to update quantity" });
        }
    } catch (err) {
        console.log("Error message: ", err);
        return res.status(500).json({ message: "Server error" });
    }
});




// Delete from the Add to Cart

router.delete("/delete", async (req, res) => {
    const { productId, userId } = req.body
    const userIdObject = new mongoose.Types.ObjectId(userId)
    const response = await addtoCartModel.deleteOne({ productId: productId, userId: userIdObject })
    if (response.deletedCount >= 1) {
        res.status(200).json({ message: "Product has been removed" });
    }
    else {
        res.status(400).json({ message: "Error in removing from Add to Cart" })
    }
})


// GET Subtotal

router.get("/subtotal", async (req, res) => {
    const { userId } = req.query;
    const userIdObject = new mongoose.Types.ObjectId(userId)
    try {
        const addtoCartData = await addtoCartModel.aggregate([
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
        ]);
        const total = addtoCartData.map((items) => {
            return items.quantity * items.productDetails.productPrice;
        }).reduce((acc, curr) => acc + curr, 0);
        res.json(total);
    } catch (error) {
        console.error('Error fetching cart with product details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Delete All

router.delete("/removeAll", async (req, res) => {
    const { userId } = req.body
    const userIdObject = new mongoose.Types.ObjectId(userId)
    try {
        const response = await addtoCartModel.deleteMany({ userId: userIdObject });
        res.status(200).json({ message: "All products removed from cart", deletedCount: response.deletedCount });
    } catch (error) {
        res.status(500).json({ message: "Error deleting products from cart", error: error.message });
    }
})

module.exports = router