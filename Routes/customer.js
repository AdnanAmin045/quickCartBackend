const mongoose = require("mongoose")
const express = require("express")
const router = express.Router();
const userModel = require("../Models/user");
const orderHistoryModel = require("../Models/orderHistory")


router.get("/", async (req, res) => {
    try {
        const adminId = req.query.adminId;

        if (!adminId) {
            return res.status(400).send({ message: "Admin ID is required" });
        }

        const adminObjectId = new mongoose.Types.ObjectId(adminId);

        const groupedOrders = await orderHistoryModel.aggregate([
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: "productData",
                    localField: "productInfo.productID",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $match: {
                    "productDetails.adminId": adminObjectId,
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            { $unwind: "$userDetails" },
            {
                $group: {
                    _id: "$userDetails.email",
                    name: { $first: "$userDetails.name" },
                    countryName: { $first: "$userDetails.countryName" },
                    totalAmount: { $sum: "$totalPrice" },
                    productInfo: {
                        $push: {
                            productID: "$productInfo.productID",
                            productTitle: "$productInfo.productTitle",
                            quantity: "$productInfo.quantity",
                            productPrice: "$productInfo.productPrice",
                        },
                    },
                    totalQuantity: { $sum: "$productInfo.quantity" },
                    lastOrderDate: { $max: "$orderAt" },
                },
            },
            {
                $project: {
                    _id: 0,
                    email: "$_id",
                    name: 1,
                    countryName: 1,
                    totalAmount: 1,
                    totalQuantity: 1,
                    lastOrderDate: 1,
                    productInfo: 1,
                },
            },
        ]);
        res.status(200).send(groupedOrders);
    } catch (error) {
        res.status(500).send({ message: "Error fetching grouped orders", error });
    }
});








module.exports = router