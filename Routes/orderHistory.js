const mongoose = require("mongoose")
const express = require("express")

const orderHistoryModel = require("../Models/orderHistory")
const productModel = require("../Models/product")


const router = express.Router()

router.get("/", async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    const result = await orderHistoryModel.aggregate([
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData",
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
        },
      },
      {
        $lookup: {
          from: "billingAddress",
          localField: "_id",  // Using _id from orderHistory
          foreignField: "orderId",  // Using orderId from billingAddress
          as: "billingDetails",
        },
      },
      {
        $unwind: "$billingDetails",
      },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          userName: {
            $first: {
              $concat: [
                "$billingDetails.firstName",
                " ",
                "$billingDetails.lastName",
              ],
            },
          },
          userEmail: { $first: "$billingDetails.email" },
          orderId: { $first: "$orderId" },
          shippingPrice: { $first: "$shippingPrice" },
          subtotal: { $first: "$subtotal" },
          totalPrice: { $first: "$totalPrice" },
          orderAt: { $first: "$orderAt" },
          paymentStatus: { $first: "$paymentStatus" },
          deliveryStatus: { $first: "$deliveryStatus" },
          productInfo: {
            $push: {
              productID: "$productDetails._id",
              productTitle: "$productDetails.title",
              quantity: "$productInfo.quantity",
              productPrice: "$productInfo.productPrice",
            },
          },
        },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching order history with billing details:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});


router.get("/getOrdersByCountries", async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    const result = await orderHistoryModel.aggregate([
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData",
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
        },
      },
      {
        $lookup: {
          from: "billingAddress",
          localField: "_id",  // Using _id from orderHistory
          foreignField: "orderId",  // Using orderId from billingAddress
          as: "billingDetails",
        },
      },
      {
        $unwind: "$billingDetails",
      },
      {
        $group: {
          _id: "$billingDetails.country",  // Group by country
          totalOrders: { $sum: 1 },         // Count total orders for each country
        },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching order history with billing details:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});



router.get("/getFromDate", async (req, res) => {
  try {
    const { adminId, date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1; 
    const year = dateObj.getFullYear();

    const result = await orderHistoryModel.aggregate([
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData", 
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
          $expr: {
            $and: [
              { $eq: [{ $month: "$orderAt" }, month] },
              { $eq: [{ $year: "$orderAt" }, year] }
            ]
          }
        },
      },
      {
        $lookup: {
          from: "billingAddress", 
          localField: "orderId",
          foreignField: "orderId",
          as: "billingDetails",
        },
      },
      {
        $unwind: "$billingDetails",
      },
      {
        $addFields: {
          userName: {
            $concat: [
              "$billingDetails.firstName", 
              " ", 
              "$billingDetails.lastName"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          userName: { $first: "$userName" },
          userEmail: { $first: "$billingDetails.email" },
          orderId: { $first: "$orderId" },
          shippingPrice: { $first: "$shippingPrice" },
          subtotal: { $first: "$subtotal" },
          totalPrice: { $first: "$totalPrice" },
          orderAt: { $first: "$orderAt" },
          paymentStatus: { $first: "$paymentStatus" },
          deliveryStatus: { $first: "$deliveryStatus" },
          productInfo: {
            $push: {
              productID: "$productDetails._id",
              productTitle: "$productDetails.title",
              quantity: "$productInfo.quantity",
              productPrice: "$productInfo.productPrice",
            },
          },
        },
      },
    ]);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching order history with billing details:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});


router.get("/todayOrders", async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start of today
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // End of today

    const result = await orderHistoryModel.aggregate([
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData", // Join with the productData collection
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
          orderAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: "$_id", // Group by unique orders
        },
      },
    ]);

    // Return the count of today's orders
    res.status(200).json({
      totalOrders: result.length,
    });
  } catch (error) {
    console.error("Error fetching today's order count:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});


router.post('/updateDeliveryStatus', async (req, res) => {
  const { id, status } = req.body;
  try {
    const updatedOrder = await orderHistoryModel.findOneAndUpdate({orderId:id},{
      deliveryStatus:status
    })
    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating delivery status", error: err });
  }
});



router.post('/updatePaymentStatus', async (req, res) => {
  const { id, value } = req.body;
  try {
    const updatedOrder = await orderHistoryModel.findOneAndUpdate({orderId:id},{
      paymentStatus:value
    })
    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating delivery status", error: err });
  }
});


router.get("/totalSales", async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    const result = await orderHistoryModel.aggregate([
      {
        $match: {
          deliveryStatus: 3,  // Filtering only records where deliveryStatus is 3
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData",
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
        },
      },
      {
        $addFields: {
          currentPriceAmount: {
            $multiply: ["$productInfo.quantity", "$productDetails.productPrice"]
          },
          costAmount: {
            $multiply: ["$productInfo.quantity", "$productDetails.productCost"]
          }
        }
      },
      {
        $addFields: {
          finalAmount: {
            $subtract: ["$currentPriceAmount", "$costAmount"]
          }
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching total amount:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});




router.get("/totalSalesOnRequiredDate", async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ error: "Invalid adminId format." });
    }

    const result = await orderHistoryModel.aggregate([
      {
        $match: {
          deliveryStatus: 3,  // Filtering only records where deliveryStatus is 3
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "productData",
          localField: "productInfo.productID",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $match: {
          "productDetails.adminId": new mongoose.Types.ObjectId(adminId),
        },
      },
      {
        $addFields: {
          currentPriceAmount: {
            $multiply: ["$productInfo.quantity", "$productDetails.productPrice"]
          },
          costAmount: {
            $multiply: ["$productInfo.quantity", "$productDetails.productCost"]
          }
        }
      },
      {
        $addFields: {
          finalAmount: {
            $subtract: ["$currentPriceAmount", "$costAmount"]
          },
          orderDate: "$orderAt"  // Adding date field
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalAmount" },
          orders: { $push: { date: "$orderDate", revenue: "$finalAmount" } }
        }
      }
    ]);

    res.status(200).json(result[0]);  // Only sending the first (and only) aggregated result
  } catch (error) {
    console.error("Error fetching total amount:", error);
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});






module.exports = router