// backend/src/modules/tour/tour.controller.js
import {
  fetchCountries,
  fetchDubaiCities,
  fetchDubaiTours,
  fetchTourDetails,
  fetchTourPrices,
  fetchTourOptions,
  fetchTourTimeslots,
  checkTourAvailability,
  cancelBookings,
  getBookedTicketsList,
  createBookingTicket,
} from "./tickets.service.js";
import prisma from "../../config/db.js";
import { validationResult } from "express-validator";

// Get available countries
export const getCountries = async (req, res) => {
  try {
    const countries = await fetchCountries();
    res.json({
      statuscode: 0,
      error: "",
      count: countries.length,
      result: countries,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch countries",
      message: error.message,
    });
  }
};

// Get Dubai cities
export const getDubaiCities = async (req, res) => {
  try {
    const uaeCountry = await getUaeCountry();
    const cities = await fetchDubaiCities(uaeCountry.countryId);
    res.json({
      statuscode: 0,
      error: "",
      count: cities.length,
      result: cities,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch Dubai cities",
      message: error.message,
    });
  }
};

// Get Dubai tours
export const getDubaiTours = async (req, res) => {
  try {
    const uaeCountry = await getUaeCountry();
    const dubaiCity = await getDubaiCity(uaeCountry.countryId);
    const tours = await fetchDubaiTours(uaeCountry.countryId, dubaiCity.cityId);

    // ✅ Get all approved tourIds from Prisma in one query
    const approved = await prisma.approvedTour.findMany({
      select: { tourId: true },
    });

    const approvedIds = approved.map((t) => t.tourId);

    // ✅ Add isApproved field to each tour
    const toursWithApproval = tours.map((tour) => ({
      ...tour,
      isApproved: approvedIds.includes(String(tour.tourId)),
    }));

    res.json({
      statuscode: 0,
      error: "",
      count: toursWithApproval.length,
      result: toursWithApproval,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch Dubai tours",
      message: error.message,
    });
  }
};

// Get Dubai tour details with price
export const getDubaiTourDetails = async (req, res) => {
  try {
    const { tourId, contractId, travelDate } = req.body;

    const uaeCountry = await getUaeCountry();
    const dubaiCity = await getDubaiCity(uaeCountry.countryId);

    const date = travelDate || new Date().toISOString().split("T")[0];

    // Fetch details + prices in parallel
    const [tourDetails, tourPrices] = await Promise.all([
      fetchTourDetails({
        countryId: uaeCountry.countryId,
        cityId: dubaiCity.cityId,
        tourId: String(tourId),
        contractId: String(contractId),
        travelDate: date,
      }),
      fetchTourPrices({
        countryId: uaeCountry.countryId,
        cityId: dubaiCity.cityId,
        travelDate: date,
      }),
    ]);

    // Filter price for current tourId + contractId
    const matchedPrice = (tourPrices || []).find(
      (p) =>
        String(p.tourId) === String(tourId) &&
        String(p.contractId) === String(contractId)
    );

    if (matchedPrice) {
      console.log("✅ Matched Price Found:", matchedPrice);
    } else {
      console.warn("⚠️ No matching price found for:", { tourId, contractId });
    }

    res.json({
      statuscode: 0,
      error: "",
      result: {
        ...tourDetails,
        price: matchedPrice || null,
      },
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message, error.stack);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch tour details",
      message: error.message,
    });
  }
};

// Get Dubai tour prices
export const getDubaiTourPrices = async (req, res) => {
  try {
    const { travelDate } = req.body;
    const uaeCountry = await getUaeCountry();
    const dubaiCity = await getDubaiCity(uaeCountry.countryId);

    const prices = await fetchTourPrices({
      countryId: uaeCountry.countryId,
      cityId: dubaiCity.cityId,
      travelDate: travelDate || new Date().toISOString().split("T")[0],
    });

    res.json({
      statuscode: 0,
      error: "",
      count: prices.length,
      result: prices,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch tour prices",
      message: error.message,
    });
  }
};

// Get Dubai tour options
export const getDubaiTourOptions = async (req, res) => {
  try {
    const {
      tourId,
      contractId,
      travelDate,
      noOfAdult = 0,
      noOfChild = 0,
      noOfInfant = 0,
    } = req.body;

    const options = await fetchTourOptions({
      tourId,
      contractId,
      travelDate: travelDate || new Date().toISOString().split("T")[0],
      noOfAdult,
      noOfChild,
      noOfInfant,
    });

    res.json({
      statuscode: 0,
      error: "",
      count: options.length,
      result: options,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch tour options",
      message: error.message,
    });
  }
};


// Get Dubai tour timeslots
export const getDubaiTourTimeslots = async (req, res) => {
  try {
    const {
      tourId,
      tourOptionId,
      travelDate,
      transferId,
      contractId,
      adult,
      child,
    } = req.body;

    console.log("🕒 Backend Timeslots Parameters:", {
      tourId,
      tourOptionId,
      travelDate,
      transferId,
      contractId,
      adult,
      child,
    });

    // ✅ Validate required parameters
    if (
      !tourId ||
      !tourOptionId ||
      !travelDate ||
      !contractId ||
      adult == null ||
      child == null
    ) {
      return res.status(400).json({
        statuscode: 1,
        error:
          "Missing required parameters: tourId, tourOptionId, travelDate, contractId, adult, child",
      });
    }

    const timeslots = await fetchTourTimeslots({
      tourId,
      tourOptionId,
      transferId,
      travelDate,
      contractId,
      adult,
      child,
    });

    console.log("✅ Backend Timeslots Result:", timeslots);

    res.json({
      statuscode: 0,
      error: "",
      count: Array.isArray(timeslots) ? timeslots.length : 0,
      result: timeslots || [],
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    console.error("❌ Controller Error Stack:", error.stack);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch timeslots",
      message: error.message,
    });
  }
};


// Check Dubai tour availability
export const checkDubaiTourAvailability = async (req, res) => {
  try {
    const { tourId, tourOptionId, transferId, travelDate, adult, contractId } =
      req.body;

    const availability = await checkTourAvailability({
      tourId,
      tourOptionId,
      transferId,
      travelDate,
      adult,
      contractId,
    });

    res.json({
      statuscode: 0,
      error: "",
      result: availability,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to check availability",
      message: error.message,
    });
  }
};


// Helper functions
const getUaeCountry = async () => {
  const countries = await fetchCountries();
  const uaeCountry = countries.find(
    (country) =>
      country.countryName.toLowerCase().includes("uae") ||
      country.countryName.toLowerCase().includes("united arab emirates")
  );

  if (!uaeCountry) {
    throw new Error("UAE country not found");
  }

  return uaeCountry;
};

const getDubaiCity = async (countryId) => {
  const cities = await fetchDubaiCities(countryId);
  const dubaiCity = cities.find((city) =>
    city.cityName.toLowerCase().includes("dubai")
  );

  if (!dubaiCity) {
    throw new Error("Dubai city not found");
  }

  return dubaiCity;
};

// approve tour ticket

export const approveTour = async (req, res) => {
  try {
    const { tourId } = req.body;

    if (!tourId) {
      return res
        .status(400)
        .json({ success: false, message: "Tour ID is required" });
    }

    // Check if tour already approved
    const existing = await prisma.approvedTour.findUnique({
      where: { tourId: String(tourId) },
    });

    if (existing) {
      await prisma.approvedTour.delete({
        where: { tourId: existing.tourId }, // safe delete
      });

      return res.json({
        success: true,
        approved: false,
        message: "Tour unapproved successfully",
      });
    } else {
      // ✅ Not approved → add it (Approve)
      await prisma.approvedTour.create({
        data: { tourId: String(tourId) },
      });

      return res.json({
        success: true,
        approved: true,
        message: "Tour approved successfully",
      });
    }
  } catch (error) {
    console.error("❌ Error approving/unapproving tour:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// Public API: Only Approved Dubai Tours
export const getDubaiToursPublic = async (req, res) => {
  try {
    const uaeCountry = await getUaeCountry();
    const dubaiCity = await getDubaiCity(uaeCountry.countryId);

    // Fetch all tours from Rayna
    const tours = await fetchDubaiTours(uaeCountry.countryId, dubaiCity.cityId);

    // Get approved IDs from Prisma
    const approved = await prisma.approvedTour.findMany({
      select: { tourId: true },
    });
    const approvedIds = approved.map((t) => t.tourId);

    // Filter only approved tours
    const approvedTours = tours.filter((tour) =>
      approvedIds.includes(String(tour.tourId))
    );

    res.json({
      statuscode: 0,
      error: "",
      count: approvedTours.length,
      result: approvedTours,
    });
  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch approved Dubai tours",
      message: error.message,
    });
  }
};

