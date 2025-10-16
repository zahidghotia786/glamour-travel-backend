// backend/src/utils/imageDownloader.js
import axios from "axios";
import fs from "fs";
import path from "path";

const ROOT_URL = "https://d2g4iwshf24scx.cloudfront.net"; // supplier root
const LOCAL_PUBLIC_DIR = path.resolve("public/tours");

export async function downloadAndSaveImage(imagePath) {
  if (!imagePath) return null;

  // ✅ Build full URL
  let imageUrl = imagePath.startsWith("http")
    ? imagePath
    : `${ROOT_URL}/${imagePath}`;

  // ✅ If URL has no extension, try adding .jpg
  if (!path.extname(imageUrl)) {
    imageUrl = imageUrl + ".jpg";
  }

  try {
    // Ensure local folder exists
    const folderPath = path.dirname(path.join(LOCAL_PUBLIC_DIR, imagePath));
    fs.mkdirSync(folderPath, { recursive: true });

    // Determine local file path
    const fileName = path.basename(imageUrl);
    const localFilePath = path.join(folderPath, fileName);

    // Download the image
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(localFilePath, response.data);

    // Return the relative URL to serve later (e.g. through express.static)
    const relativeUrl = `/tours/${imagePath}/${fileName}`.replace(/\\/g, "/");
    return relativeUrl;
  } catch (err) {
    console.error(`❌ Error downloading image: ${imageUrl}`, err.message);
    return null;
  }
}
