const mongoose = require("mongoose");
const express = require("express")
const router = express.Router()

const productModel = require('../Models/product')



require("dotenv").config();

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");

// Configure AWS S3 Client
const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
});

// Middleware for multer to handle image upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        key: function (req, file, cb) {
            const fileName = Date.now().toString() + "-" + file.originalname;
            cb(null, fileName);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for file size (optional)
}).single("productImage");

// Get Product Data

router.get("/getProducts", async (req, res) => {
    const { userID, category } = req.query;
    if (!userID || !category) {
        return res.status(400).json({
            success: false,
            message: "userID and category are required parameters."
        });
    }
    try {
        const productData = await getProductData(userID, category);
        res.json(productData);
    } catch (err) {
        console.log("Error Message:", err);
        res.status(500).send("Error fetching product data");
    }
});


const getProductData = async (userID, category) => {
    try {
        const data = await productModel.aggregate([
            {
                $lookup: {
                    from: "wishlist",
                    localField: "_id",
                    foreignField: "productId",
                    as: "wishlistData"
                }
            },
            {
                $addFields: {
                    isInWishlist: {
                        $cond: {
                            if: { $gt: [{ $size: "$wishlistData" }, 0] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "reviews",
                    let: { productId: "$_id" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { $in: ["$$productId", "$productIds"] } 
                            } 
                        }
                    ],
                    as: "productReviews"
                }
            },
            {
                $addFields: {
                    averageRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$productReviews" }, 0] },
                            then: { $avg: "$productReviews.rating" },
                            else: 0
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "addtoCart",
                    localField: "_id",
                    foreignField: "productId",
                    as: "productAllData"
                }
            },
            {
                $match: {
                    category: category,
                    status: "InStock"
                }
            },
            {
                $project: {
                    img: 1,
                    title: 1,
                    description: 1,
                    status: 1,
                    previousPrice: 1,
                    productPrice: 1,
                    productCost: 1,
                    discount: 1,
                    category: 1,
                    quantity: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$productAllData",
                                            as: "item",
                                            cond: { $eq: ["$$item.userId", new mongoose.Types.ObjectId(userID)] }
                                        }
                                    },
                                    0
                                ]
                            },
                            { quantity: 0 }
                        ]
                    },
                    averageRating: 1,
                    isInWishlist: 1
                }
            },
            {
                $unwind: {
                    path: "$productAllData",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);
        return data;
    } catch (error) {
        console.error("Error fetching product data:", error);
        return { error: "Failed to fetch product data" };
    }
};







// Add Product


router.post('/addProduct', upload, async (req, res) => {
    const { productName, productCategory, currentPrice, previousPrice, discount, productDescription, tags, adminId, quantity, productCost } = req.body;
    try {
        const parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags || "[]");
        const adminObjectId = new mongoose.Types.ObjectId(adminId);
        const newProduct = new productModel({
            adminId: adminObjectId,
            img: {
                url: req.file.location,
                key: req.file.key,
            },
            title: productName,
            description: productDescription,
            status: 'InStock',
            previousPrice: previousPrice,
            productPrice: currentPrice,
            productCost: productCost,
            discount: discount,
            category: productCategory,
            tags: parsedTags,
            productquantity: quantity,
            addedAt: Date.now(),
        });
        await newProduct.save();
        res.status(200).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        console.log("Error adding product:", error);
        res.status(500).json({ message: 'Error adding product', error });
    }
});

// Update Quantity 

router.post("/updateQuantity", async (req, res) => {
    try {
        const extractedData = req.body;
        const updatePromises = extractedData.map(async ({ id, quantity }) => {
            const productId = new mongoose.Types.ObjectId(id);

            const product = await productModel.findById(productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${id} not found` });
            }

            const newQuantity = product.productquantity - quantity;
            if (newQuantity === 0) {
                await productModel.updateOne(
                    { _id: productId },
                    { $set: { status: "Out of Stock" } }
                )
            }

            await productModel.updateOne(
                { _id: productId },
                { $set: { productquantity: newQuantity } }
            );
        });
        await Promise.all(updatePromises);
        return res.status(200).json({ message: "Quantities updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});






module.exports = router