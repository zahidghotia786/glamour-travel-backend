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

// booking sections 

// services/bookingService.js

export async function createBookingTicket(bookingData, userId) {
  let bookingRecord = null;

  try {
    validateBookingData(bookingData);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { b2bAccounts: true }
    });

    if (!user) throw new Error('User not found');

    console.log('=== SENDING TO EXTERNAL API ===');
    
    // Step 1: Create pending booking
    bookingRecord = await createPendingBooking(bookingData, user);

    // Step 2: Call external API
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Booking/bookings`,
      bookingData,
      { 
        headers: getHeaders(),
        timeout: 30000
      }
    );

    const apiResponse = response.data;
    console.log('=== EXTERNAL API RESPONSE ===');
    console.log('API Response:', JSON.stringify(apiResponse, null, 2));
    
    // 🚨 FIXED: Handle external API business errors properly
    if (apiResponse.statuscode === 200 && apiResponse.error && apiResponse.error.description) {
      // External API returned business logic error
      const businessError = new Error(apiResponse.error.description);
      businessError.isBusinessError = true; // Mark as business error
      throw businessError;
    }
    
    // Step 3: Update booking record if successful
    if (apiResponse.statuscode === 200 && apiResponse.result) {
      await updateBookingWithApiResponse(bookingRecord.id, bookingData, apiResponse, user);
      return apiResponse;
    } else {
      // Handle other external API errors
      const errorMessage = apiResponse.error?.description || apiResponse.error || 'External API booking failed';
      const externalError = new Error(errorMessage);
      externalError.isExternalError = true;
      throw externalError;
    }

  } catch (error) {
    console.error('=== BOOKING SERVICE ERROR ===');
    console.error('Error message:', error.message);
    
    // If API call fails, update booking status to FAILED
    if (bookingRecord) {
      await prisma.booking.update({
        where: { id: bookingRecord.id },
        data: { 
          status: 'FAILED',
          apiResponse: { error: error.message }
        }
      });
    }
    
    // Re-throw the error with proper classification
    throw error;
  }
}

async function createPendingBooking(bookingData, user) {
  const tourDetail = bookingData.TourDetails[0];
  const totalNet = parseFloat(tourDetail.serviceTotal) || 0;
  
  const { totalMarkup, totalGross } = await calculateMarkup(tourDetail, user);
  const b2bAccount = user.b2bAccounts.length > 0 ? user.b2bAccounts[0] : null;
  const leadPassenger = bookingData.passengers.find(p => p.leadPassenger === 1) || bookingData.passengers[0];

  // 🚨 FIX: Check if reference already exists and generate unique one if needed
  let reference = bookingData.clientReferenceNo || `REF-${Date.now()}`;
  
  // Check if reference already exists in database
  const existingBooking = await prisma.booking.findUnique({
    where: { reference }
  });
  
  if (existingBooking) {
    // Generate unique reference if duplicate found
    reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  return await prisma.booking.create({
    data: {
      reference: reference, // Use the verified unique reference
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      currency: 'AED',
      totalNet: totalNet || 0,
      totalMarkup: totalMarkup || 0,
      totalGross: totalGross || 0,
      passengerCount: bookingData.passengers.length,
      leadPassenger: {
        firstName: leadPassenger.firstName,
        lastName: leadPassenger.lastName,
        email: leadPassenger.email,
        mobile: leadPassenger.mobile,
        nationality: leadPassenger.nationality
      },
      user: {
        connect: { id: user.id }
      },
      ...(b2bAccount && {
        b2bAccount: {
          connect: { id: b2bAccount.id }
        }
      }),
      items: {
        create: bookingData.TourDetails.map(tour => ({
          name: `Tour ${tour.tourId}`,
          date: new Date(tour.tourDate),
          quantity: (tour.adult || 0) + (tour.child || 0) + (tour.infant || 0),
          unitNet: parseFloat(tour.adultRate) || 0,
          unitGross: calculateUnitGross(tour, user),
          subtotalNet: parseFloat(tour.serviceTotal) || 0,
          subtotalGross: parseFloat(tour.serviceTotal) + totalMarkup,
        }))
      },
      apiCalledAt: new Date()
    }
  });
}

async function updateBookingWithApiResponse(bookingId, bookingData, apiResponse, user) {
  const tourDetail = bookingData.TourDetails[0];
  const totalNet = parseFloat(tourDetail.serviceTotal) || 0;
  const { totalMarkup, totalGross } = await calculateMarkup(tourDetail, user);
  const leadPassenger = bookingData.passengers.find(p => p.leadPassenger === 1) || bookingData.passengers[0];

  return await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: mapApiStatusToDbStatus(apiResponse.result.BookingStatus),
      supplierRef: apiResponse.result.bookingId?.toString(),
      voucherUrl: apiResponse.result.ticketURL,
      // 🚨 Use the external API's reference number if available
      reference: apiResponse.result.referenceNo, // This comes from external API
      totalNet,
      totalMarkup,
      totalGross,
      externalBookingId: apiResponse.result.bookingId?.toString(),
      apiResponse: apiResponse,
      apiCalledAt: new Date(),
      syncedAt: new Date(),
      leadPassenger: {
        firstName: leadPassenger.firstName,
        lastName: leadPassenger.lastName,
        email: leadPassenger.email,
        mobile: leadPassenger.mobile,
        nationality: leadPassenger.nationality
      }
    },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true
        }
      },
      b2bAccount: true
    }
  });
}

async function calculateMarkup(tourDetail, user) {
  const totalNet = parseFloat(tourDetail.serviceTotal) || 0;
  let totalMarkup = 0;

  if (user.role === 'B2B' && user.b2bAccounts.length > 0) {
    const b2bAccount = user.b2bAccounts[0];
    
    // Check for product-specific markup rules
    const markupRule = await prisma.markupRule.findFirst({
      where: {
        b2bAccountId: b2bAccount.id,
        productId: await getProductIdFromTourId(tourDetail.tourId),
        isActive: true
      }
    });

    if (markupRule) {
      // Use product-specific markup
      totalMarkup = (totalNet * markupRule.percentage) / 100;
    } else if (b2bAccount.defaultMarkup > 0) {
      // Use account default markup
      totalMarkup = (totalNet * b2bAccount.defaultMarkup) / 100;
    }
  } else if (user.markupValue > 0) {
    // Use user's personal markup
    if (user.markupType === 'percentage') {
      totalMarkup = (totalNet * user.markupValue) / 100;
    } else {
      totalMarkup = user.markupValue; // fixed markup
    }
  }

  return {
    totalMarkup,
    totalGross: totalNet + totalMarkup
  };
}

function calculateUnitGross(tourDetail, user) {
  const unitNet = parseFloat(tourDetail.adultRate) || 0;
  // Similar markup calculation logic for unit price
  // This is simplified - you might want more complex logic
  return unitNet;
}

// Helper function to map API status to your database status
function mapApiStatusToDbStatus(apiStatus) {
  const statusMap = {
    'Confirmed': 'CONFIRMED',
    'Pending': 'PENDING', 
    'Cancelled': 'CANCELLED',
    'Failed': 'FAILED',
    'Booked': 'CONFIRMED'
  };
  return statusMap[apiStatus] || 'PENDING';
}

// Helper function to get product ID from tour ID
async function getProductIdFromTourId(tourId) {
  // You need to implement this mapping based on your business logic
  // This could be from a mapping table, externalId field, or metadata
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { metadata: { path: ['externalTourId'], equals: parseInt(tourId) } },
        { metadata: { path: ['raynaTourId'], equals: parseInt(tourId) } }
      ]
    }
  });
  
  return product?.id || null;
}



// Enhanced validation function - FIXED FOR leadPassenger AS INTEGER
function validateBookingData(bookingData) {
  if (!bookingData.TourDetails || !Array.isArray(bookingData.TourDetails) || bookingData.TourDetails.length === 0) {
    throw new Error('TourDetails is required');
  }
  
  if (!bookingData.passengers || !Array.isArray(bookingData.passengers) || bookingData.passengers.length === 0) {
    throw new Error('Passengers are required');
  }

  const tourDetail = bookingData.TourDetails[0];
  if (!tourDetail.tourDate || !tourDetail.tourId) {
    throw new Error('Tour date and tour ID are required');
  }

  // 🚨 UPDATED: Validate passenger structure for leadPassenger as INTEGER
  let leadPassengerCount = 0;
  bookingData.passengers.forEach((passenger, index) => {
    if (!passenger.firstName) throw new Error(`Passenger[${index}]: firstName is required`);
    if (!passenger.lastName) throw new Error(`Passenger[${index}]: lastName is required`);
    if (!passenger.email) throw new Error(`Passenger[${index}]: email is required`);
    if (!passenger.mobile) throw new Error(`Passenger[${index}]: mobile is required`);
    if (!passenger.nationality) throw new Error(`Passenger[${index}]: nationality is required`);
    if (!passenger.paxType) throw new Error(`Passenger[${index}]: paxType is required`);
    
    // 🚨 UPDATED: Check leadPassenger field - should be INTEGER (1/0)
    if (passenger.leadPassenger === undefined || passenger.leadPassenger === null) {
      throw new Error(`Passenger[${index}]: leadPassenger is required`);
    }
    
    if (typeof passenger.leadPassenger !== 'number') {
      throw new Error(`Passenger[${index}]: leadPassenger should be a number (1 or 0)`);
    }
    
    if (passenger.leadPassenger !== 0 && passenger.leadPassenger !== 1) {
      throw new Error(`Passenger[${index}]: leadPassenger should be 1 or 0`);
    }
    
    // Count lead passengers
    if (passenger.leadPassenger === 1) {
      leadPassengerCount++;
    }
  });

  // Ensure exactly one lead passenger
  if (leadPassengerCount !== 1) {
    throw new Error(`Must have exactly one lead passenger, found ${leadPassengerCount}`);
  }
}


//  * Get booked tickets

export async function getBookedTicketsList(ticketData) {
  try {
    validateTicketData(ticketData);

    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Booking/GetBookedTickets`,
      ticketData,
      { headers: getHeaders() }
    );

    return response.data;
  } catch (error) {
    handleAxiosError(error, "Failed to fetch tickets");
  }
}

/**
 * Validate ticket data according to API documentation
 */
function validateTicketData(data) {
  const requiredFields = ["uniqueNo", "referenceNo", "bookedOption"];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(data.bookedOption) || data.bookedOption.length === 0) {
    throw new Error("bookedOption must be a non-empty array");
  }

  data.bookedOption.forEach((option, index) => {
    if (!option.serviceUniqueId) {
      throw new Error(`bookedOption[${index}]: Missing serviceUniqueId`);
    }
    if (!option.bookingId) {
      throw new Error(`bookedOption[${index}]: Missing bookingId`);
    }
  });

  // Validate data types
  if (typeof data.uniqueNo !== 'number') {
    throw new Error("uniqueNo must be a number");
  }

  if (typeof data.referenceNo !== 'string') {
    throw new Error("referenceNo must be a string");
  }
}

//  * Cancel a booking

export async function cancelBookings(cancellationData) {
  try {
    validateCancellationData(cancellationData);

    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Booking/cancelbooking`,
      cancellationData,
      { headers: getHeaders() }
    );

    return response.data;
  } catch (error) {
    handleAxiosError(error, "Cancellation failed");
  }
}

/**
 * Validate cancellation data
 */
function validateCancellationData(data) {
  const requiredFields = ["bookingId", "referenceNo", "cancellationReason"];
  for (const field of requiredFields) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }
}

//  * Handle axios errors consistently
function handleAxiosError(error, defaultMessage) {
  if (error.response) {
    throw new Error(error.response.data.error || defaultMessage);
  } else if (error.request) {
    throw new Error("No response from Rayna API");
  } else {
    throw new Error(error.message || defaultMessage);
  }
}




// Helper function for headers
const getHeaders = () => ({
  "Authorization": `Bearer ${config.rayna.token}`,
  "Content-Type": "application/json",
  "Accept": "application/json"
});