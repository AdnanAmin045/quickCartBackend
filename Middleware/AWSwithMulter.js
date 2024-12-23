require("dotenv").config();

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const sharp = require("sharp"); // Image compression library
const { removeBackgroundFromImageBase64 } = require("remove.bg"); // Background removal library

// Configure AWS S3 Client
const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
});

// Middleware for multer to handle image upload and compression
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: "public-read",
        key: function (req, file, cb) {
            const fileName = Date.now().toString() + "-" + file.originalname;
            cb(null, fileName);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for file size (optional)
}).single("productImage");

// Compress image before uploading to S3 and remove background
const compressAndRemoveBackground = (req, res, next) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send("No file uploaded");
    }

    // First remove background using remove.bg
    removeBackgroundFromImageBase64({
        base64img: file.buffer.toString("base64"),
        apiKey: process.env.REMOVE_BG_API_KEY, // API key for remove.bg
    })
        .then((result) => {
            // Replace original file buffer with the background-removed image
            req.file.buffer = Buffer.from(result.base64img, "base64");

            // Now compress image using sharp
            sharp(req.file.buffer)
                .resize(800) // Resize to a width of 800px (optional)
                .webp({ quality: 80 }) // Convert to WebP format with 80% quality (optional)
                .toBuffer((err, compressedBuffer) => {
                    if (err) {
                        return res.status(500).send("Error compressing image");
                    }

                    // Replace the original buffer with the compressed one
                    req.file.buffer = compressedBuffer;
                    next(); // Proceed to upload the processed image
                });
        })
        .catch((err) => {
            return res.status(500).send("Error removing background");
        });
};

// Add compressAndRemoveBackground to your route before multer
module.exports = { upload, compressAndRemoveBackground };
