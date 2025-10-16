import axios from 'axios';
import {config} from '../../config/env.js';
import Booking from '../../models/booking.model.js';

// Send booking to Rayna API after payment is confirmed
export async function sendBookingToRayna(booking) {
  try {
    const bookingData = {
      uniqueNo: booking.reference,  // must be unique
      TourDetails: booking.tourDetails.map(t => ({
        serviceUniqueId: t.serviceUniqueId,
        tourId: t.tourId,
        optionId: t.optionId,
        adult: t.adult,
        child: t.child,
        infant: t.infant,
        tourDate: t.tourDate,
        timeSlotId: t.timeSlotId,
        startTime: t.startTime,
        transferId: t.transferId,
        pickup: t.pickup,
        adultRate: t.adultRate,
        childRate: t.childRate,
        serviceTotal: t.serviceTotal
      })),
      passengers: booking.passengers.map(p => ({
        serviceType: p.serviceType,
        prefix: p.prefix,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        mobile: p.mobile,
        nationality: p.nationality,
        message: p.message,
        leadPassenger: p.leadPassenger,
        paxType: p.paxType,
        clientReferenceNo: p.clientReferenceNo
      }))
    };

    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Booking/bookings`,
      bookingData,
      { headers: getHeaders() }
    );

    if (response.data.statuscode !== 200) {
      throw new Error(response.data.error || "Rayna booking failed");
    }

    // Save Rayna booking info in MongoDB
    booking.raynaBookingId = response.data.result?.[0]?.bookingId || null;
    booking.raynaBookingResponse = response.data;
    booking.raynaStatus = 'CONFIRMED';
    await booking.save();

    return response.data;

  } catch (err) {
    booking.raynaStatus = 'FAILED';
    booking.raynaBookingResponse = err.message;
    await booking.save();
    throw err;
  }
}

export async function getMergedBookedTickets(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const requestData = {
    uniqNO: booking.reference,
    referenceNo: booking.reference,
    bookedOption: booking.tourDetails.map(t => ({
      serviceUniqueId: t.serviceUniqueId,
      bookingId: booking.raynaBookingId
    }))
  };

  const response = await axios.post(
    `${config.rayna.baseUrl}/api/Booking/GetBookedTickets`,
    requestData,
    { headers: getHeaders() }
  );

  return {
    dbBooking: booking,
    raynaTickets: response.data
  };
}


// Cancel booking on Rayna API
export async function cancelBookingOnRayna(booking) {
  try {
    const response = await axios.post(
      `${config.rayna.baseUrl}/api/Booking/cancelbooking`,
      {
        bookingId: booking.raynaBookingId,
        referenceNo: booking.reference,
        cancellationReason: 'User requested cancellation'
      },
      { headers: getHeaders() }
    );

    // Update MongoDB booking status
    booking.raynaStatus = 'CANCELLED';
    booking.status = 'CANCELLED';
    booking.paymentStatus = 'CANCELLED';
    await booking.save();

    return response.data;

  } catch (err) {
    throw new Error('Cancellation failed: ' + err.message);
  }
}





// Helper function for headers
const getHeaders = () => ({
  "Authorization": `Bearer ${config.rayna.token}`,
  "Content-Type": "application/json",
  "Accept": "application/json"
});