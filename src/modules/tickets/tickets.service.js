// backend/src/modules/tour/tour.service.js
import axios from "axios";
import { config } from "../../config/env.js";
import path from "path";
import { downloadImage } from "./downloadImage.js";

// Fetch countries
export const fetchCountries = async () => {
  try {
    const response = await axios.get(
      `${config.rayna.baseUrl}/api/Tour/countries`,
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error fetching countries:", error.message);
    throw error;
  }
};

// Fetch Dubai cities
export const fetchDubaiCities = async (countryId) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/cities`,
      { CountryId: countryId },
      {
        headers: getHeaders()
      }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error fetching cities:", error.message);
    throw error;
  }
};

// // Fetch Dubai tours
// export const fetchDubaiTours = async (countryId, cityId) => {
//   try {
//     const response = await axios.post(
//       `${config.rayna.baseUrl}/api/Tour/tourstaticdata`,
//       { countryId, cityId },
//       { headers: getHeaders() }
//     );

//     const tours = response.data.result || [];

//     const processedTours = await Promise.all(
//       tours.map(async (tour) => {
//         try {
//           if (!tour.imagePath) {
//             return { ...tour, imagePath: "/uploads/tours/placeholder.jpg" };
//           }

//           let safePath = tour.imagePath.trim();
//           const hasExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(safePath);

//           // 🔹 If no extension in image path
//           if (!hasExtension) {
//             const numericFilename = /\/\d+$/;
//             if (numericFilename.test(safePath)) {
//               const extensionsToTry = ['.jpg', '.png', '.jpeg', '.webp'];
//               for (const ext of extensionsToTry) {
//                 const testPath = safePath + ext;
//                 const fullUrl = `${config.rayna.imageRoot}/${testPath}`;

//                 console.log(`🔄 Trying extension ${ext} for tour ${tour.tourId}`);
//                 const downloadedPath = await downloadImage(fullUrl, path.basename(testPath), tour.tourId);

//                 if (downloadedPath) {
//                   return { ...tour, imagePath: downloadedPath };
//                 }
//               }
//             }

//             // Fallback if no extension worked
//             return { ...tour, imagePath: "/uploads/tours/placeholder.jpg" };
//           }

//           // 🔹 If extension exists in path
//           const fullUrl = `${config.rayna.imageRoot}/${safePath}`;
//           console.log(`📥 Downloading from: ${fullUrl}`);

//           const fileName = path.basename(safePath);
//           const newPath = await downloadImage(fullUrl, fileName, tour.tourId);

//           return { 
//             ...tour, 
//             imagePath: newPath || "/uploads/tours/placeholder.jpg" 
//           };
//         } catch (err) {
//           console.error(`⚠️ Image handling failed for tour ${tour.tourId}:`, err.message);
//           return { ...tour, imagePath: "/uploads/tours/placeholder.jpg" };
//         }
//       })
//     );

//     return processedTours;
//   } catch (error) {
//     console.error("❌ Error fetching tours:", error.message);
//     throw error;
//   }
// };

export const fetchDubaiTours = async (countryId, cityId) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/tourstaticdata`,
      { countryId, cityId },
      { headers: getHeaders() }
    );

    return response.data?.result || [];
  } catch (error) {
    console.error("❌ Error fetching tours:", error.message);
    return []; // safe fallback instead of breaking app
  }
};


// Fetch tour details
export const fetchTourDetails = async (params) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/tourStaticDataById`,
      params,
      {
        headers: getHeaders()
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching tour details:", error.message);
    throw error;
  }
};

// Fetch tour prices
export const fetchTourPrices = async (params) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/tourlist`,
      params,
      {
        headers: getHeaders()
      }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error fetching tour prices:", error.message);
    throw error;
  }
};

// Fetch tour options
export const fetchTourOptions = async (params) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/touroption`,
      params,
      {
        headers: getHeaders()
      }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error fetching tour options:", error.message);
    throw error;
  }
};

// Fetch tour timeslots
export const fetchTourTimeslots = async (params) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/timeslot`,
      params,
      {
        headers: getHeaders()
      }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error fetching timeslots:", error.message);
    throw error;
  }
};

// Check tour availability
export const checkTourAvailability = async (params) => {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/availability`,
      params,
      { headers: getHeaders() }
    );
    return response.data.result || [];
  } catch (error) {
    console.error("❌ Error checking availability:", error.message);
    throw error;
  }
};


// Helper function for headers
const getHeaders = () => ({
  "Authorization": `Bearer ${config.rayna.token}`,
  "Content-Type": "application/json",
  "Accept": "application/json"
});