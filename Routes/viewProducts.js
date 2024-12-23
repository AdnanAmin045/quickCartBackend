const mongoose = require("mongoose")
const express = require("express")
const productModel = require("../Models/product");
const orderHistoryModel = require("../Models/orderHistory");

const router = express.Router();

router.get("/", async (req, res) => {
    const { adminId } = req.query
    const id = new mongoose.Types.ObjectId(adminId)
    try {
        const response = await productModel.find({ adminId: id })
        if (response) {
            res.status(200).json(
                { productList: response, productListLength: response.length }
            )
        }
        else {
            res.status(400).json({ message: "Record not found" })
        }
    } catch (err) {
        console.log("Error", err)
    }


});


router.get("/checkPendingProduct", async (req, res) => {
    const { adminId, productId } = req.query;

    const adminIdentity = new mongoose.Types.ObjectId(adminId)
    const productIdentity = new mongoose.Types.ObjectId(productId)

    if (!adminId || !productId) {
        return res.status(400).json({ message: "Admin ID and Product ID are required." });
    }

    try {
        const orderWithProduct = await orderHistoryModel.findOne({
            "productInfo.productID": productIdentity
        });
        if (!orderWithProduct) {
            return res.status(404).json({ message: "Product not found in order history." });
        }

        const product = await productModel.findOne({
            _id: productId,
            adminId: adminIdentity
        });

        if (!product) {
            return res.status(403).json({ message: "This product does not belong to the specified admin." });
        }

        return res.status(200).json({
            message: "The product exists in order history and belongs to the admin.",
        });
    } catch (error) {
        console.error("Error checking product and admin:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});


router.delete("/deleteProduct", async (req, res) => {
    const { productId } = req.query
    const id = new mongoose.Types.ObjectId(productId)
    try {
        const response = await productModel.deleteOne({ _id: id })
        if (response.deletedCount > 0) {
            res.status(200).json({ message: "Product has been deleted" })
        }
        else {
            res.status(400).json({ message: "There is an error in deletion" })
        }
    }
    catch (err) {
        console.log("Error in delete the product")
        res.status(400).json({ message: "Server Error" })
    }

})

router.post("/updateProduct", async (req, res) => {
    const product = req.body;
    console.log("Incoming Product:", product);

    try {
        const productId = new mongoose.Types.ObjectId(product._id);
        delete product._id;

        const response = await productModel.findOneAndUpdate(
            { _id: productId },
            { ...product },
            { new: true }
        );
        if (!response) {
            return res.status(404).json({ message: "Product not found or not updated" });
        }

        res.status(200).json({ message: "Updated Successfully", updatedProduct: response });
    } catch (err) {
        console.error("Error updating product:", err);
        res.status(500).json({ message: "Server error: Product not updated" });
    }
});






module.exports = router