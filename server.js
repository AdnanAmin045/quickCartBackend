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

app.use("/authentication",authRoute);
app.use("/navbar",navbarRoute);
app.use("/wishlist",wishListRoute);
app.use("/addtoCart",addtoCartRoute);
app.use("/product",productRoute);
app.use("/checkout",checkoutRoute);
app.use("/orderHistory",orderHistoryRoute);
app.use("/viewProduct",viewProductRoute);
app.use("/customer",customerRoute);


connectDB(); 

const adminId = new mongoose.Types.ObjectId('674345b6e10edb116b787ef6');

const createRandomProduct = async () => {
  const randomProduct = new productModel({
    adminId: adminId,
    title: "Foster Farms Takeout Crispy Classic Buffalo Wings",
    img: "https://klbtheme.com/bacola/wp-content/uploads/2021/04/product-image-45-768x691.jpg",
    description: "Vivamus adipiscing nisl ut dolor dignissim semper. Nulla luctus malesuada tincidunt. Class aptent taciti sociosqu ad litora torquentThis is a randomly generated product description.",
    status:"InStock",
    previousPrice:6.99,
    currentPrice:4.99,
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

        const hashedPassword = await bcrypt.hash('password123', 10);
      // Step 1: Create a random user (for example purpose)
      const user = new userModel({
        name: "Adnan Amin",
        email: "adnanamin.available@gmail.com",
        password: hashedPassword,
        countryCode: "+92",
        contactNo: "3265145770",
        countryName: "Pakistan",
        status: 1,
      });
      const savedUser = await user.save();
      const admin = new adminModel({
        adminId: savedUser._id, // Linking to the user model
        brand: "daniCollection",
        dob: new Date("2006-01-01"),
        city: "Lahore",
        postalAddress: "56655",
      });

      await admin.save();

    }
    catch(err){
        console.log(err)
    }
}

//saveAdminData();


// Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
