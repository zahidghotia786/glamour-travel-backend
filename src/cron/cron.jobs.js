import cron from "node-cron";
import { syncDubaiToursAndPrices } from "../modules/tour/tour.sync.service.js";

export async function startTourSyncCron() {
  // 1️⃣ Run sync immediately
  try {
    console.log("🚀 Initial sync starting...");
    await syncDubaiToursAndPrices();
    console.log("✅ Initial sync completed");
  } catch (err) {
    console.error("❌ Initial sync failed:", err);
  }

  // 2️⃣ Schedule cron for every day at 03:00 AM
  cron.schedule("0 3 * * *", async () => {
    console.log("⏰ CRON: Syncing Dubai tours...");
    try {
      await syncDubaiToursAndPrices();
      console.log("✅ CRON: Sync completed");
    } catch (err) {
      console.error("❌ CRON sync failed:", err);
    }
  });
}
