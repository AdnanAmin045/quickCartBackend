const mongoose = require("mongoose");
const express = require("express")
const router = express.Router()

const productModel = require('../Models/product');
const offersModel = require("../Models/offers")



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


router.put("/updateExpiredOffers", async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const today = new Date();
        const expiredOffers = await offersModel.find(
            { toDate: { $lt: today } },
            { adminId: 1 }
        );

        if (!expiredOffers || expiredOffers.length === 0) {
            await session.endSession();
            return res.status(404).json({
                success: false,
                message: "No expired offers found"
            });
        }

    
        for (const offer of expiredOffers) {
            const { adminId } = offer; 

            const productUpdateResponse = await productModel.updateMany(
                { adminId },
                {
                    $set: {
                        productPrice: {
                            $subtract: [
                                "$previousPrice",
                                {
                                    $multiply: [
                                        "$previousPrice",
                                        { $divide: ["$discount", 100] }
                                    ]
                                }
                            ]
                        }
                    }
                },
                { session }
            );

            if (productUpdateResponse.modifiedCount === 0) {
                console.warn(`No products updated for adminId: ${adminId}`);
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Expired offers processed and product prices updated"
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
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
                    isInWishlist: 1,
                    flatOfferDiscount: 1
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



const getProductDataById = async (userID, productId) => {
    try {
        const data = await productModel.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(productId), status: "InStock" }
            },
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
                $addFields: {
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
                    }
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
                    quantity: 1,
                    averageRating: 1,
                    isInWishlist: 1,
                    flatOfferDiscount: 1
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
            flatOfferDiscount: 0
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



router.post("/addOffer", async (req, res) => {
    const data = req.body;
    const adminId = new mongoose.Types.ObjectId(data.adminId);

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const response = await offersModel.create([data], { session });

        if (!response) {
            throw new Error("Failed to create the offer");
        }

        const updateProduct = await productModel.updateMany(
            { adminId },
            [
                {
                    $set: {
                        flatOfferDiscount: data.discount,
                        productPrice: {
                            $multiply: ["$previousPrice", { $subtract: [1, { $divide: [data.discount, 100] }] }]
                        }
                    }
                }
            ],
            { session }
        );

        if (!updateProduct.modifiedCount) {
            throw new Error("Failed to update products");
        }

        await session.commitTransaction();
        res.status(200).json({ message: "Offer added successfully", offer: response });

    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ message: "Server error", error: err.message });
    } finally {
        session.endSession();
    }
});




router.get("/getOffer", async (req, res) => {
    const { adminId } = req.query;
    const id = new mongoose.Types.ObjectId(adminId);

    try {
        const today = new Date();
        const response = await offersModel.find({ adminId: id });

        const updatedResponse = response.map(offer => ({
            ...offer.toObject(),
            isActive: offer.toDate > today
        }));

        res.status(200).json({
            success: true,
            data: updatedResponse
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.delete("/deleteOffer", async (req, res) => {
    const { adminId, offerId } = req.query;
    const session = await mongoose.startSession();

    try {
        const offerObjectId = new mongoose.Types.ObjectId(offerId);
        const adminObjectId = new mongoose.Types.ObjectId(adminId);

        session.startTransaction();

        const offerResponse = await offersModel.findOneAndDelete(
            { _id: offerObjectId, adminId: adminObjectId },
            { session }
        );

        if (!offerResponse) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Offer not found or access denied"
            });
        }

        // Update product prices and reset flatOfferDiscount
        const productUpdateResponse = await productModel.updateMany(
            { adminId: adminObjectId },
            [
                {
                    $set: {
                        productPrice: {
                            $subtract: [
                                "$previousPrice",
                                {
                                    $multiply: [
                                        "$previousPrice",
                                        { $divide: ["$discount", 100] }
                                    ]
                                }
                            ]
                        },
                        flatOfferDiscount: 0
                    }
                }
            ],
            { session }
        );

        if (productUpdateResponse.modifiedCount === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Offer deleted but no products updated"
            });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Offer deleted successfully, products updated"
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
});



router.put("/updateOffer", async (req, res) => {
    const { adminId, currentOffer, editOfferId } = req.body;
    const adminid = new mongoose.Types.ObjectId(adminId);
    const offerId = new mongoose.Types.ObjectId(editOfferId);

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start the transaction

    try {
        // Step 1: Update the Offer
        const updatedOffer = await offersModel.findOneAndUpdate(
            { _id: offerId, adminId: adminid },
            { $set: currentOffer },
            { new: true, session } // Pass the session
        );

        if (!updatedOffer) {
            await session.abortTransaction(); // Rollback transaction
            return res.status(404).json({ message: "Offer not found or access denied." });
        }

        // Step 2: Apply Discount to Products
        const { discount } = currentOffer;

        const products = await productModel.find({ adminId: adminid }).session(session); 
        if (products.length === 0) {
            await session.abortTransaction(); 
            return res.status(404).json({ message: "No products found for the given admin." });
        }
        const updatedProducts = await Promise.all(
            products.map(async (product) => {
                const flatDiscount = (product.previousPrice * product.flatOfferDiscount) / 100;
                const priceBeforeDiscount = product.productPrice + flatDiscount;
                const finalPrice = priceBeforeDiscount - (priceBeforeDiscount * discount) / 100;
                return productModel.findByIdAndUpdate(
                    product._id,
                    {
                        $set: {
                            productPrice: finalPrice,
                            flatOfferDiscount: discount,
                        },
                    },
                    { new: true, session } // Pass the session
                );
            })
        );

        // Commit the transaction
        await session.commitTransaction();

        res.status(200).json({
            message: "Offer and products updated successfully.",
            offer: updatedOffer,
            products: updatedProducts,
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Error processing request.", error: error.message });
    } finally {
        
        session.endSession();
    }
});

router.get("/getSearchProduct", async (req, res) => {
    try {
        const products = await productModel.find({}, "_id title");
        res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Server error while fetching products" });
    }
});


router.get("/getProductWithId",async(req,res)=>{
    const {id,userId} = req.query
    try {
        const productData = await getProductDataById(userId,id);
        res.json(productData);
    } catch (err) {
        console.log("Error Message:", err);
        res.status(500).send("Error fetching product data");
    }
})











module.exports = router