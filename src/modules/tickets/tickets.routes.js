// backend/src/modules/tour/tour.routes.js
import express from "express";
import {
  getCountries,
  getDubaiCities,
  getDubaiTours,
  getDubaiTourDetails,
  getDubaiTourPrices,
  getDubaiTourOptions,
  getDubaiTourTimeslots,
  checkDubaiTourAvailability,
  approveTour,
  getDubaiToursPublic
} from "./tickets.controller.js";
import { authenticateToken, requireRole } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET endpoints for Dubai data
router.get("/countries", getCountries);
router.get("/dubai/cities", getDubaiCities);
router.get("/dubai/tours", authenticateToken, requireRole('ADMIN'), getDubaiTours);
router.get("/dubai/tours/public", getDubaiToursPublic);
router.post("/approve", authenticateToken, requireRole('ADMIN'), approveTour);

router.post("/dubai/tour-details", getDubaiTourDetails);
router.post("/dubai/tour-prices", getDubaiTourPrices);
router.post("/dubai/tour-options", getDubaiTourOptions);
router.post("/dubai/timeslots", getDubaiTourTimeslots);
router.post("/dubai/availability", checkDubaiTourAvailability);

export default router;