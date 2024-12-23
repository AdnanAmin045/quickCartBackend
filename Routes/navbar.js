const express = require("express")
const router = express.Router();
const addtoCartModel = require("../Models/addtoCart")
const mongoose = require("mongoose")



// Get Subtotal of Cart
router.get("/getSubtotal", async (req, res) => {
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
})



module.exports = router