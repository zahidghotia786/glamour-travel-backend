import Tour from "../../models/tours/Tour.js";
import TourApproval from "../../models/tours/TourApproval.js";
import * as tourService from "./tour.service.js";

// Get all Dubai tours
export const getDubaiTours = async (req, res) => {
  try {
    const tours = await tourService.getAllDubaiTours();
    res.json({
      success: true,
      data: tours,
    });
  } catch (err) {
    console.error("Failed to fetch Dubai tours:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch Dubai tours",
    });
  }
};

// Toggle tour approval (approve/reset)
export const toggleApproval = async (req, res) => {
  try {
    const { tourId, contractId, markupType, markupValue } = req.body;

    // Validate required fields
    if (!tourId || !contractId || !markupType || markupValue === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (tourId, contractId, markupType, markupValue) are required",
      });
    }

    // Toggle approval
    const result = await tourService.tourApprovalService.toggleTourApproval({
      tourId,
      contractId,
      markupType,
      markupValue,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      action: result.action,
      isApproved: result.action === "approved",
    });
  } catch (error) {
    console.error("Error in toggleApproval:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



 // Cancel tour approval

 export const cancelApproval = async (req, res) => {
    try {
      const { tourId, contractId } = req.body;

      // Validate required fields
      if (!tourId || !contractId) {
        return res.status(400).json({
          success: false,
          message: 'tourId and contractId are required'
        });
      }

      const result = await tourService.tourApprovalService.cancelTourApproval(tourId, contractId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          cancelledApproval: result.cancelledApproval
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Error in cancelApproval:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }




// ✅ Public: Get only approved Dubai tours
export const getApprovedDubaiToursForPublic = async (req, res) => {
  try {
    const tours = await tourService.getApprovedDubaiToursForPublic();
    res.json({
      success: true,
      data: tours,
    });
  } catch (error) {
    console.error("Failed to fetch approved Dubai tours for public:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved Dubai tours",
    });
  }
};



export const getDubaiTourDetails = async (req, res) => {
  try {
    const { tourId: inputTourId, contractId: inputContractId, travelDate, countryId, cityId } = req.body;
    const date = travelDate || new Date().toISOString().split("T")[0];

    // --------------------------
    // STEP 1: Fetch external API
    // --------------------------

    const externalTourDetails = await tourService.fetchTourDetails({
      countryId: String(countryId),
      cityId: String(cityId),
      tourId: String(inputTourId),
      contractId: String(inputContractId),
      travelDate: date,
    });

    // -------------------------------
    // STEP 2: Resolve effective IDs
    // -------------------------------
    // Many APIs may return fields under different shapes; we attempt to resolve common ones.
    const resolvedTourId =
      String(
        externalTourDetails?.tourId ??
        externalTourDetails?.result?.tourId ??
        inputTourId
      );
    const resolvedContractId =
      String(
        externalTourDetails?.contractId ??
        externalTourDetails?.result?.contractId ??
        inputContractId
      );

    // -------------------------------------------
    // STEP 3: Fetch TourApproval using resolved IDs
    // -------------------------------------------
    const approvalQuery = { tourId: String(resolvedTourId), contractId: String(resolvedContractId) };
    console.log("STEP 3 - Looking for approval with:", approvalQuery);
    const approvalData = await TourApproval.findOne(approvalQuery).lean();
    console.log("STEP 3 - Approval result:", approvalData);

    // -------------------------------------------------------
    // STEP 4: Fetch Tour record (try top-level and rawJson)
    // -------------------------------------------------------
    // Tour schema stores tourId/contractId as strings; rawJson may contain numeric contractId.
    const tourQuery = {
      tourId: String(resolvedTourId),
      $or: [
        { contractId: String(resolvedContractId) },                        // top-level string
        { "rawJson.contractId": String(resolvedContractId) },             // nested string
        { "rawJson.contractId": Number(resolvedContractId) },             // nested number
      ],
    };

    const tourDbData = await Tour.findOne(tourQuery).lean();

    // -------------------------------------------------------
    // STEP 5: Collect candidate prices and log them
    // -------------------------------------------------------
    // Candidate sources:
    //  - tourDbData.rawJson.price.amount
    //  - tourDbData.priceAmount
    //  - externalTourDetails.price.amount (or externalTourDetails.result.price.amount)
    const externalPriceCandidate = Number(
      externalTourDetails?.price?.amount ??
      externalTourDetails?.result?.price?.amount ??
      0
    );

    const tourRawJsonPriceCandidate = Number(tourDbData?.rawJson?.price?.amount ?? 0);
    const tourRawJsonPriceAmountCandidate = Number(tourDbData?.rawJson?.price?.priceAmount ?? 0);
    const tourPriceAmountCandidate = Number(tourDbData?.priceAmount ?? 0);
    const tourPriceObjCandidate = Number(tourDbData?.price?.amount ?? 0);


    // Determine originalPrice by priority (db.rawJson -> db.priceAmount -> external)
    let originalPrice = 0;
    if (!isNaN(tourRawJsonPriceCandidate) && tourRawJsonPriceCandidate > 0) {
      originalPrice = tourRawJsonPriceCandidate;
    } else if (!isNaN(tourRawJsonPriceAmountCandidate) && tourRawJsonPriceAmountCandidate > 0) {
      originalPrice = tourRawJsonPriceAmountCandidate;
    } else if (!isNaN(tourPriceAmountCandidate) && tourPriceAmountCandidate > 0) {
      originalPrice = tourPriceAmountCandidate;
    } else if (!isNaN(tourPriceObjCandidate) && tourPriceObjCandidate > 0) {
      originalPrice = tourPriceObjCandidate;
    } else if (!isNaN(externalPriceCandidate) && externalPriceCandidate > 0) {
      originalPrice = externalPriceCandidate;
    } else {
      console.warn("STEP 5 - No valid original price found in any source; defaulting to 0");
    }

    // -------------------------------------------------------
    // STEP 6: Apply markup if approval exists (and log each step)
    // -------------------------------------------------------
    let finalPrice = originalPrice;
    let markupType = null;
    let markupValue = 0;
    let markupAmount = 0;

    if (approvalData) {
      markupType = approvalData.markupType;
      markupValue = Number(approvalData.markupValue ?? 0);


      if (markupType === "percentage") {
        markupAmount = (originalPrice * markupValue) / 100;
        finalPrice = originalPrice + markupAmount;
      } else if (markupType === "fixed") {
        markupAmount = markupValue;
        finalPrice = originalPrice + markupAmount;
      }

      finalPrice = Math.round(finalPrice * 100) / 100;
    } else {
      console.log("STEP 6 - No approval found; finalPrice remains originalPrice:", finalPrice);
    }

    // -------------------------------------------------------
    // STEP 7: Prepare and send response (with logs)
    // -------------------------------------------------------
    const priceObject = {
      amount: finalPrice,
      originalPrice: originalPrice,
      markupType,
      markupValue,
      markupAmount,
      isAdminPrice: !!approvalData,
    };


    const responseData = {
      ...externalTourDetails,
      price: priceObject,
    };

    return res.json({
      statuscode: 0,
      error: "",
      result: responseData,
    });
  } catch (error) {
    console.error("❌ getDubaiTourDetails Error:", error.message, error.stack);
    return res.status(500).json({
      statuscode: 1,
      error: "Failed to fetch tour details",
      message: error.message,
    });
  }
};




// dubai tour options 


// ✅ Get Dubai tour options with admin markup applied
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

    const date = travelDate || new Date().toISOString().split("T")[0];

    // Step 1: Fetch options from external API
    const optionsData = await tourService.fetchTourOptions({
      tourId,
      contractId,
      travelDate: date,
      noOfAdult,
      noOfChild,
      noOfInfant,
    });

    // Step 2: Fetch markup info from DB
    const approvalData = await TourApproval.findOne({
      tourId: String(tourId),
      contractId: String(contractId),
    });

    let markupType = null;
    let markupValue = 0;

    if (approvalData) {
      markupType = approvalData.markupType;
      markupValue = Number(approvalData.markupValue);
    } else {
      console.log("⚠️ No markup found for this tour");
    }

    // Step 3: Apply markup to each option
    const optionsWithMarkup = optionsData.map((option, optionIndex) => {


      const updatedOption = { ...option };

      if (markupType) {
        // Apply markup directly to the option object
        // Adult Price
        if (updatedOption.adultPrice) {
          updatedOption.adultPrice =
            markupType === "percentage"
              ? +(updatedOption.adultPrice * (1 + markupValue / 100)).toFixed(2)
              : +(updatedOption.adultPrice + markupValue).toFixed(2);
        }
        
        // Child Price
        if (updatedOption.childPrice) {
          updatedOption.childPrice =
            markupType === "percentage"
              ? +(updatedOption.childPrice * (1 + markupValue / 100)).toFixed(2)
              : +(updatedOption.childPrice + markupValue).toFixed(2);
        }
        
        // Infant Price
        if (updatedOption.infantPrice) {
          updatedOption.infantPrice =
            markupType === "percentage"
              ? +(updatedOption.infantPrice * (1 + markupValue / 100)).toFixed(2)
              : +(updatedOption.infantPrice + markupValue).toFixed(2);
        }
        
        // Final Amount
        if (updatedOption.finalAmount) {
          updatedOption.finalAmount =
            markupType === "percentage"
              ? +(updatedOption.finalAmount * (1 + markupValue / 100)).toFixed(2)
              : +(updatedOption.finalAmount + markupValue).toFixed(2);
        }

        // Without Discount Amount (if exists)
        if (updatedOption.withoutDiscountAmount) {
          updatedOption.withoutDiscountAmount =
            markupType === "percentage"
              ? +(updatedOption.withoutDiscountAmount * (1 + markupValue / 100)).toFixed(2)
              : +(updatedOption.withoutDiscountAmount + markupValue).toFixed(2);
        }
      }

      // Add markup info to option
      updatedOption.markupType = markupType;
      updatedOption.markupValue = markupValue;
      updatedOption.isAdminPrice = !!approvalData;

      return updatedOption;
    });


    res.json({
      statuscode: 0,
      error: "",
      count: optionsWithMarkup.length,
      result: optionsWithMarkup,
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




// Check Dubai tour availability
export const checkDubaiTourAvailability = async (req, res) => {
  try {
    const { tourId, tourOptionId, transferId, travelDate, adult, contractId } =
      req.body;

    const availability = await tourService.checkTourAvailability({
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