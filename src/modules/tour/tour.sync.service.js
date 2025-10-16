// backend/src/modules/tour/tour.sync.service.js
import axios from "axios";
import { format } from "date-fns";
import { downloadAndSaveImage } from "../../utils/imageDownloader.js";
import { config } from "../../config/env.js";
import Tour from "../../models/tours/Tour.js"; // Your Mongoose tour model

const ROOT_URL = config.rayna.baseUrl;

const getHeaders = () => ({
  Authorization: `Bearer ${config.rayna.token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
});

async function fetchCountries() {
  const { data } = await axios.get(`${ROOT_URL}/api/Tour/countries`, {
    headers: getHeaders(),
  });
  return data?.result || [];
}

async function fetchCities(countryId) {
  const { data } = await axios.post(
    `${ROOT_URL}/api/Tour/cities`,
    { CountryId: countryId },
    { headers: getHeaders() }
  );
  return data?.result || [];
}

async function fetchStaticTours(countryId, cityId) {
  const { data } = await axios.post(
    `${ROOT_URL}/api/Tour/tourstaticdata`,
    { countryId, cityId },
    { headers: getHeaders() }
  );
  return data?.result || [];
}

async function fetchTourPrices({ countryId, cityId, travelDate }) {
  const { data } = await axios.post(
    `${ROOT_URL}/api/Tour/tourlist`,
    { countryId, cityId, travelDate },
    { headers: getHeaders() }
  );
  return data?.result || [];
}

export async function syncDubaiToursAndPrices() {
  console.log("🚀 Starting Dubai tour + price sync");

  // 1️⃣ Get Country (UAE)
  const countries = await fetchCountries();
  const uae = countries.find(
    (c) => c.countryName?.toLowerCase() === "united arab emirates"
  );
  if (!uae) throw new Error("UAE not found");

  // 2️⃣ Get City (Dubai)
  const cities = await fetchCities(uae.countryId);
  const dubai = cities.find(
    (c) =>
      c.cityName?.toLowerCase() === "dubai city" ||
      c.cityName?.toLowerCase() === "dubai"
  );
  if (!dubai) throw new Error("Dubai not found");

  // 3️⃣ Fetch static tours
  const tours = await fetchStaticTours(uae.countryId, dubai.cityId);

  // 4️⃣ Fetch today's prices
  const today = format(new Date(), "yyyy-MM-dd");
  const prices = await fetchTourPrices({
    countryId: uae.countryId,
    cityId: dubai.cityId,
    travelDate: today,
  });

  console.log(`📊 ${prices.length} prices fetched for ${today}`);

  // 5️⃣ Delete old Dubai tours
  await Tour.deleteMany({ cityName: "Dubai" });

  // 6️⃣ Merge & Save
  for (const tour of tours) {
    const matchedPrice = prices.find(
      (p) =>
        String(p.tourId) === String(tour.tourId) &&
        String(p.contractId) === String(tour.contractId)
    );

    // 🖼️ Download and save image locally
    let localImageUrl = null;
    try {
      localImageUrl = await downloadAndSaveImage(tour.imagePath);
    } catch (err) {
      console.warn(`⚠️ Image download failed for tour ${tour.tourId}:`, err.message);
    }

    const merged = {
      ...tour,
      price: matchedPrice || null,
      priceAmount: matchedPrice?.amount || null,
      discount: matchedPrice?.discount || null,
      localImageUrl,
    };

    // Save to MongoDB
    const tourDoc = new Tour({
      tourId: String(tour.tourId),
      cityName: tour.cityName,
      countryName: tour.countryName,
      rawJson: merged,
    });

    await tourDoc.save();
  }

  console.log(`✅ Synced ${tours.length} Dubai tours`);
}





