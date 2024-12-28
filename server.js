const express = require("express");
require('dotenv').config();
const cors = require("cors");
const mongoose = require('mongoose')
const connectDB = require("./Configuration/db.js")
const authRoute = require("./Routes/authentication.js")
const navbarRoute = require('./Routes/navbar.js')
const wishListRoute = require('./Routes/wishlist.js')
const addtoCartRoute = require('./Routes/addtoCart.js')
const productRoute = require('./Routes/product.js')
const checkoutRoute = require("./Routes/checkout.js")
const orderHistoryRoute = require("./Routes/orderHistory.js");
const viewProductRoute = require("./Routes/viewProducts.js");
const customerRoute = require("./Routes/customer.js")


const userModel = require("./Models/user.js")
const adminModel = require("./Models/admin.js")
const productModel = require('./Models/product.js');

const bcrypt = require("bcrypt")


const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/authentication", authRoute);
app.use("/navbar", navbarRoute);
app.use("/wishlist", wishListRoute);
app.use("/addtoCart", addtoCartRoute);
app.use("/product", productRoute);
app.use("/checkout", checkoutRoute);
app.use("/orderHistory", orderHistoryRoute);
app.use("/viewProduct", viewProductRoute);
app.use("/customer", customerRoute);


connectDB();

const adminId = new mongoose.Types.ObjectId('674345b6e10edb116b787ef6');

const createRandomProduct = async () => {
  const randomProduct = new productModel({
    adminId: adminId,
    title: "Foster Farms Takeout Crispy Classic Buffalo Wings",
    img: "https://klbtheme.com/bacola/wp-content/uploads/2021/04/product-image-45-768x691.jpg",
    description: "Vivamus adipiscing nisl ut dolor dignissim semper. Nulla luctus malesuada tincidunt. Class aptent taciti sociosqu ad litora torquentThis is a randomly generated product description.",
    status: "InStock",
    previousPrice: 6.99,
    currentPrice: 4.99,
    discount: 8,
    category: "home",
    tags: ["fresh", "fruit", "organic"],
    productquantity: Math.floor(Math.random() * 100) + 1,
  });

  try {
    const savedProduct = await randomProduct.save();
    console.log("Product saved successfully:", savedProduct);
  } catch (error) {
    console.error("Error saving product:", error);
  }
};
//createRandomProduct()


async function saveAdminData() {
  try {

    const hashedPassword = await bcrypt.hash('password321', 10);
    // Step 1: Create a random user (for example purpose)
    const user = new userModel({
      name: "Noman Amin",
      email: "nomanamin.available@gmail.com",
      password: hashedPassword,
      countryCode: "+92",
      contactNo: "3065299143",
      countryName: "Pakistan",
      status: 1,
    });
    const savedUser = await user.save();
    const admin = new adminModel({
      adminId: savedUser._id, // Linking to the user model
      brand: "nomiCollection",
      dob: new Date("2006-01-16"),
      city: "Khanewal",
      postalAddress: "56655",
    });

    await admin.save();

  }
  catch (err) {
    console.log(err)
  }
}

async function addFieldToAllProducts(fieldName, defaultValue) {
  try {
    const result = await productModel.updateMany(
      {},
      { $set: { [fieldName]: defaultValue } },
      { upsert: true }
    );

    console.log(
      `Field '${fieldName}' added successfully. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
    );
  } catch (err) {
    console.error("Error adding field in products:", err.message);
  }
}

// Function to update field values in all documents
async function updateFieldValues(fieldName, value) {
  try {
    const result = await productModel.updateMany(
      {},
      { $set: { [fieldName]: value } }
    );

    console.log(
      `Field '${fieldName}' values updated successfully. Modified: ${result.modifiedCount}`
    );
  } catch (err) {
    console.error("Error updating field values in products:", err.message);
  }
}

//updateFieldValues("flatOfferDiscount", 0)
//data();
//saveAdminData();


const updateProductPricesByAdmin = async (adminId) => {
  try {
      const id = new mongoose.Types.ObjectId(adminId);

      // Fetch all products for the given adminId
      const products = await productModel.find({ adminId: id });

      if (!products.length) {
          return { success: false, message: "No products found for this adminId" };
      }

      const bulkOperations = products.map(product => {
          // Double-check if both `previousPrice` and `discount` are valid
          if (product.previousPrice && product.discount) {
              const discountedPrice = product.previousPrice * (1 - product.discount / 100);

              return {
                  updateOne: {
                      filter: { _id: product._id },
                      update: { $set: { productPrice: discountedPrice } }
                  }
              };
          }
          return null;
      }).filter(op => op !== null); // Filter out invalid operations

      if (bulkOperations.length > 0) {
          const result = await productModel.bulkWrite(bulkOperations);
          console.log(`${result.modifiedCount} products updated successfully`);
          return { success: true, message: `${result.modifiedCount} products updated successfully` };
      } else {
          console.log("No valid products to update");
          return { success: false, message: "No valid products to update" };
      }
  } catch (err) {
      console.error("Error updating products:", err.message);
      return { success: false, message: err.message };
  }
};
//updateProductPricesByAdmin("675de1041cd93bf7196926d4");
// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
