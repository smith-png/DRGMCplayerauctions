import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a buffer to Cloudinary with an optional folder and public_id
 * @param {Buffer} buffer - The file buffer to upload
 * @param {string} folder - Optional folder name
 * @param {string} publicId - Optional public ID for the image
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder = 'auction-general', publicId = null) => {
    return new Promise((resolve, reject) => {
        const options = { folder };
        if (publicId) options.public_id = publicId;

        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export default cloudinary;
