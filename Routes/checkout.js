const express = require("express");

const billingAddressModel = require("../Models/billingAddress");
const orderHistoryModel = require("../Models/orderHistory");
const mongoose = require("mongoose");
const reviewsModel = require("../Models/reviews")
const stripe = require('stripe')('sk_test_51QSvzYKypTY7oIgzz4M9eAPjPiVKVx8Nk2qujSWlt52eejlWklARnAe7XzfXUKf3Z2zqeg5Y4SdZ8SbFQrpOLt0C00NQZrIrDL');

const router = express.Router();

router.post("/add", async (req, res) => {
    const {
        firstName,
        lastName,
        country,
        city,
        address,
        optionalAddress,
        phone,
        email,
        note,
        cardNo,
        cvc,
        expiryDate,
        userId,
        productList,
        shippingPrice,
        totalPrice,
        subtotal,
        postalCode,
        paymentStatus
    } = req.body;
    try {
        // Validate request body
        if (!userId || !Array.isArray(productList) || productList.length === 0) {
            return res.status(400).json({ message: "Invalid input data" });
        }

        // Convert userId to ObjectId
        const id = new mongoose.Types.ObjectId(userId);

        const uniqueOrderID = await generateUniqueOrderID();

        // Create billing address
        const productDataArray = productList.map((product) => ({
            productID: new mongoose.Types.ObjectId(product.productId),
            productTitle: product.productDetails.title,
            quantity: product.quantity,
            productPrice: product.productDetails.productPrice,
        }));

        // Create order history
        const orderResponse = await orderHistoryModel.create({
            userId: userId,
            orderId: uniqueOrderID,
            shippingPrice: shippingPrice,
            productInfo: productDataArray,
            totalPrice,
            subtotal,
            paymentStatus
        });

        const orderData = await orderResponse.save();


        const billingResponse = await billingAddressModel.create({
            orderId: orderResponse._id,
            userId: id,
            firstName,
            lastName,
            country,
            city,
            phoneNo: phone,
            address,
            optionalAddress,
            email,
            optionalNote: note,
            cardNo,
            cvc,
            expiryDate,
            postalCode
        });

        await billingResponse.save();

        // Process productList
        res.status(200).json({
            message: "Billing address and order history updated successfully",
            billing: billingResponse,
            order: orderData,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Something went wrong", error });
    }
});



// Get the Data for Order 


router.get("/get", async (req, res) => {
    const { orderId } = req.query;

    const idforOrder = new mongoose.Types.ObjectId(orderId)

    try {
        const orderHistory = await orderHistoryModel.findOne({ _id: idforOrder });

        if (!orderHistory) {
            return res.status(404).json({ message: "Order not found" });
        }
        const billingAddress = await billingAddressModel.findOne({ orderId: idforOrder });

        if (!billingAddress) {
            return res.status(404).json({ message: "Billing address not found" });
        }
        res.json({
            orderHistory,
            billingAddress
        });
    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Function to generate random 5-digit orderID
function generateRandomOrderID() {
    return Math.floor(10000 + Math.random() * 90000);
}

// Function to ensure orderID is unique
async function generateUniqueOrderID() {
    let orderID;
    let isUnique = false;

    while (!isUnique) {
        orderID = generateRandomOrderID();
        const existingOrder = await orderHistoryModel.findOne({ orderId: orderID });
        if (!existingOrder) {
            isUnique = true;
        }
    }

    return orderID;
}


// payment 


router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).send({ error: 'Invalid amount' });
        }

        // Convert amount to cents
        const amountInCents = Math.round(amount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            payment_method_types: ['card'],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.log("err")
        res.status(500).send({ error: error.message });
    }
});


router.post("/addReview", async (req, res) => {
    const { userId, orderId, rating, review } = req.body;

    const idforuser = new mongoose.Types.ObjectId(userId);
    const idfororder = new mongoose.Types.ObjectId(orderId)

    try {
        const order = await orderHistoryModel.findOne({ _id: idfororder });
        if (!order) {
            return res.status(404).send({ success: false, message: "Order not found" });
        }
        const productIds = order.productInfo.map((product) => product.productID);
        const response = await reviewsModel.create({
            customerId: idforuser, rating, review, productIds
        });
        await response.save();
        res.status(200).send({ success: true, message: "Review added successfully", data: response });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Failed to add review", error: err.message });
    }
});

module.exports = router;
