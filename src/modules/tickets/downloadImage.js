import axios from "axios";
import fs from "fs";
import path from "path";

// Enhanced download function with better error handling
export const downloadImage = async (imageUrl, fileName, tourId) => {
  try {
    // Ensure fileName has an extension
    let finalFileName = fileName;
    if (!path.extname(fileName)) {
      // If no extension, try to detect from content type or use .jpg as default
      finalFileName = `${fileName}.jpg`;
    }

    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status === 200, // Only consider 200 as success
    });

    const uploadDir = path.resolve("uploads/tours");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadPath = path.join(uploadDir, finalFileName);
    const writer = fs.createWriteStream(uploadPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(`/uploads/tours/${finalFileName}`));
      writer.on("error", (error) => {
        console.error(`❌ Error writing file for tour ${tourId}:`, error.message);
        reject(error);
      });
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`⚠️ Image not found (404) for tour ${tourId}: ${imageUrl}`);
    } else if (error.code === 'ECONNABORTED') {
      console.warn(`⏰ Timeout downloading image for tour ${tourId}: ${imageUrl}`);
    } else {
      console.error(`❌ Error downloading image for tour ${tourId}:`, error.message);
    }
    return null;
  }
};

