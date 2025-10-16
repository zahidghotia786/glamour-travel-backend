import axios from "axios";
import { config } from "../../config/env.js";
import Tour from "../../models/tours/Tour.js";
import TourApproval from "../../models/tours/TourApproval.js";

/**
 * Get all Dubai tours with approval info and admin price
 */
export const getAllDubaiTours = async () => {
  try {
    const tours = await Tour.find({ cityName: "Dubai" }).sort({ createdAt: -1 });

    const tourIds = tours.map(t => t.tourId);

    const approvals = await TourApproval.find({ tourId: { $in: tourIds } });

    // Build approval map with string keys
    const approvalMap = {};
    approvals.forEach(a => {
      const key = `${String(a.tourId)}_${String(a.contractId)}`;
      approvalMap[key] = {
        approvedByAdmin: true,
        markupType: a.markupType,
        markupValue: a.markupValue
      };
    });

    // Map tours with approval info
    const toursWithApproval = tours.map(t => {
      // Ensure we get the correct contractId
      const contractId = t.contractId || t.rawJson?.contractId || t.price?.contractId;
      const key = `${String(t.tourId)}_${String(contractId)}`;
      const approval = approvalMap[key];

      // Get original price from the correct location
      const originalPrice = t.rawJson?.price?.amount || t.priceAmount || t.price?.amount || 0;

      // Calculate new price based on admin markup
      let priceByAdmin = originalPrice; // default is original price
      
      if (approval) {
        if (approval.markupType === "percentage") {
          // Add percentage markup: original price + (markup percentage of original price)
          const markupAmount = (originalPrice * approval.markupValue) / 100;
          priceByAdmin = originalPrice + markupAmount;
        } else if (approval.markupType === "fixed") {
          // Add fixed markup: original price + fixed markup value
          priceByAdmin = originalPrice + approval.markupValue;
        }
        
        // Round to 2 decimal places for currency
        priceByAdmin = Math.round(priceByAdmin * 100) / 100;
      }

      return {
        ...t.toObject(),
        approvedByAdmin: approval?.approvedByAdmin || false,
        markupType: approval?.markupType || null,
        markupValue: approval?.markupValue || null,
        originalPrice: originalPrice, // Include original price for reference
        priceByAdmin: priceByAdmin,
        // Calculate markup amount for display
        markupAmount: approval ? 
          (approval.markupType === "percentage" 
            ? (originalPrice * approval.markupValue) / 100 
            : approval.markupValue) 
          : 0
      };
    });

    return toursWithApproval;

  } catch (error) {
    console.error("Error fetching Dubai tours with approval info:", error);
    throw new Error("Failed to fetch Dubai tours");
  }
};




// Tour Approval Service class
export class TourApprovalService {
  // Toggle tour approval - create if not exists, delete if exists
  async toggleTourApproval({ tourId, contractId, markupType, markupValue }) {
    try {
      // Check if approval already exists
      const existingApproval = await TourApproval.findOne({ tourId, contractId });

      if (existingApproval) {
        // Delete existing approval (reset)
        await TourApproval.deleteOne({ _id: existingApproval._id });
        return {
          action: "reset",
          message: "Tour approval reset successfully",
        };
      } else {
        // Create new approval
        const tourApproval = new TourApproval({
          tourId,
          contractId,
          markupType,
          markupValue,
        });

        await tourApproval.save();

        return {
          action: "approved",
          data: tourApproval,
          message: "Tour approved successfully",
        };
      }
    } catch (error) {
      throw new Error(`Error toggling tour approval: ${error.message}`);
    }
  }

  // Simple check if approved
  async cancelTourApproval(tourId, contractId) {
    try {
      // Find and delete the approval
      const result = await TourApproval.findOneAndDelete({
        tourId,
        contractId
      });

      if (result) {
        return {
          success: true,
          message: 'Tour approval cancelled successfully',
          cancelledApproval: result
        };
      } else {
        return {
          success: false,
          message: 'No approval found to cancel'
        };
      }
    } catch (error) {
      throw new Error(`Error cancelling tour approval: ${error.message}`);
    }
  }
}





// ✅ Get only approved Dubai tours for public
export const getApprovedDubaiToursForPublic = async () => {
  try {
    // Find only Dubai tours
    const tours = await Tour.find({ cityName: "Dubai" }).sort({ createdAt: -1 });
    const tourIds = tours.map(t => t.tourId);

    // Find approvals for these tours
    const approvals = await TourApproval.find({ tourId: { $in: tourIds } });

    // Make map of approvals
    const approvalMap = {};
    approvals.forEach(a => {
      const key = `${String(a.tourId)}_${String(a.contractId)}`;
      approvalMap[key] = {
        markupType: a.markupType,
        markupValue: a.markupValue,
      };
    });

    // Filter only approved tours and calculate price
    const approvedTours = tours
      .map(t => {
        const contractId = t.contractId || t.rawJson?.contractId || t.price?.contractId;
        const key = `${String(t.tourId)}_${String(contractId)}`;
        const approval = approvalMap[key];

        if (!approval) return null; // ❌ skip unapproved

        const originalPrice = t.rawJson?.price?.amount || t.priceAmount || t.price?.amount || 0;
        let finalPrice = originalPrice;

        if (approval.markupType === "percentage") {
          finalPrice += (originalPrice * approval.markupValue) / 100;
        } else if (approval.markupType === "fixed") {
          finalPrice += approval.markupValue;
        }

        finalPrice = Math.round(finalPrice * 100) / 100;

        return {
          ...t.toObject(),
          priceByAdmin: finalPrice,
          originalPrice,
          markupType: approval.markupType,
          markupValue: approval.markupValue,
        };
      })
      .filter(Boolean); // remove nulls

    return approvedTours;
  } catch (error) {
    console.error("Error fetching approved Dubai tours for public:", error);
    throw new Error("Failed to fetch approved Dubai tours for public");
  }
};



// Fetch tour details
export const fetchTourDetails = async (params) => {
  try {
    console.log("📡 Sending to Rayna API:", params);

    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Tour/tourStaticDataById`,
      params,
      {
        headers: getHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching external tour details:", error.response?.data || error.message);
    throw error;
  }
};



export const getTourFromDB = async (tourId, contractId) => {
  try {
    // ✅ Tour collection se data lo (rawJson ke liye)
    return await Tour.findOne({
      tourId: String(tourId),
      contractId: String(contractId),
    });
  } catch (error) {
    console.error("❌ Error fetching tour from DB:", error.message);
    throw error;
  }
};




// dubai tour options fetch 


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


// Create a single instance for export
export const tourApprovalService = new TourApprovalService();



const getHeaders = () => ({
  Authorization: `Bearer ${config.rayna.token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
});