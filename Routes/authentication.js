const express = require("express")
const bcrypt = require("bcrypt")
const router = express.Router();
const jwt = require("jsonwebtoken");
const secret_key = process.env.SECRET_KEY;

const userModel = require('../Models/user')
const adminModel = require("../Models/admin");
const mongoose = require("mongoose");
const billingAddressModel = require("../Models/billingAddress");

//SignUP

router.post("/signUp", async (req, res) => {
    const { name, email, userPassword, countryCode, contactNo, countryName } = req.body;
    const password = await bcrypt.hash(userPassword, 10)
    const status = 0;
    const newUser = new userModel({
        name, email, password, countryCode, contactNo, countryName, status
    });
    try {
        await newUser.save();
        res.status(201).send("User registered successfully!");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering user");
    }
});


// check Existing Email

router.get("/signUp", async (req, res) => {
    const userEmail = req.query.email;
    try {
        const existingUser = await userModel.findOne({
            email: userEmail
        });
        if (existingUser) {
            res.status(200).send("Email already exists");
        } else {
            res.status(404).send("Email does not exist");
        }
    } catch (error) {
        console.error("Error checking email:", error);
        res.status(500).send("Error checking email");
    }
})


//logIn


router.post("/logIn", async (req, res) => {
    const { email, password } = req.body;
    try {
        const data = await userModel.findOne({ email: email });
        if (data) {
            const isMatch = await bcrypt.compare(password, data.password);
            if (isMatch) {
                const token = jwt.sign({ data }, secret_key, { expiresIn: "2h" });
                res.status(200).json({
                    token: token,
                    Id: data._id,
                    status: data.status,
                    success: true,
                    message: "User found",
                    data
                });
            } else {
                res.status(400).json({ success: false, message: "Invalid credentials" });
            }
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});


// get Admin Data


router.get("/viewProfileAdmin", async (req, res) => {
    try {
        const adminId = req.query.adminId;

        if (!adminId) {
            return res.status(400).json({ message: "Admin ID is required" });
        }
        const userId = new mongoose.Types.ObjectId(adminId)
        const userData = await userModel.findOne({ _id: userId })

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }
        const adminData = await adminModel.findOne({ adminId });

        if (!adminData) {
            return res.status(404).json({ message: "Admin not found" });
        }
        const combinedData = {
            ...userData.toObject(), 
            adminDetails: adminData.toObject()
        };

        return res.status(200).json(combinedData);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
})


// update admin Profile


router.put("/updateAdminProfile", async (req, res) => {
    const { email, countryCode, contactNo, brand, dob, adminId } = req.body;
    const id = new mongoose.Types.ObjectId(adminId)
    try {
        const user = await userModel.findOne({ _id: id })
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.email = email
        user.countryCode = countryCode
        user.contactNo = contactNo
        await user.save();
        const admin = await adminModel.findOne({ adminId: id })

        admin.brand = brand;
        admin.dob = new Date(dob);

        await admin.save();

        return res.status(200).json({ message: "Updated successfully" });

    }
    catch (err) {
        console.log("Error: ", err)
    }
})

// update Admin Address


router.put("/updateAdminAddress",async (req,res)=>{
    const {country,postalAddress,city,adminId} = req.body
    const id = new mongoose.Types.ObjectId(adminId)
    try{

        const user = await userModel.findOne({ _id: id })
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.countryName = country
        await user.save();
        
        
        const admin = await adminModel.findOne({ adminId: id })

        admin.postalAddress = postalAddress;
        admin.city = city;

        await admin.save();

        return res.status(200).json({ message: "Updated successfully" }); 

    }
    catch(err){
        console.log("Error", err)
    }
})


// Reset Password


router.put("/adminResetPassword", async (req, res) => {
    try {
        const { oldPassword, newPassword, userId } = req.body;
        if (!oldPassword || !newPassword || !userId) {
            return res.status(400).json("All fields are required.");
        }

        // Validate userID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json("Invalid User ID.");
        }
        const adminId = new mongoose.Types.ObjectId(userId)
        const user = await userModel.findById({ _id: adminId });
        if (!user) {
            return res.status(404).json("User not found.");
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json("Old password is incorrect.");
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();
        res.status(200).json("Password reset successfully.");
    } catch (error) {
        console.error("Error in password reset:", error);
        res.status(500).json("An error occurred while resetting the password.");
    }
});


// Check Old Password 

router.get("/checkOldPassword", async (req, res) => {
    const { oldPassword, userId } = req.query
    const id = new mongoose.Types.ObjectId(userId)
    try {

        const user = await userModel.findOne({ _id: id })
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json("Old password is incorrect.");
        }
        else {
            return res.status(200).json({ message: "Old Password is correct" })
        }
    }
    catch (err) {
        console.log("Error: ", err)
    }
})

// get Country

router.get("/getCountry",async (req,res) =>{
    const {id} = req.query
    const userId = new mongoose.Types.ObjectId(id)
    try {
        const response = await userModel.findOne({ _id: userId });
        if (response) {
            res.status(200).json({ 
                message: "User found", 
                country: response.countryName
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error: error.message });
    }

})





module.exports = router