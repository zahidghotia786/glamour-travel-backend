import express from "express";
import { syncDubaiToursAndPrices } from "./tour.sync.service";

const router = express.Router();

router.post("/sync-dubai-tours", async (req, res) => {
  try {
    await syncDubaiToursAndPrices();
    res.json({ success: true, message: "Dubai tours synced successfully" });
  } catch (err) {
    console.error("❌ Dubai sync error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
