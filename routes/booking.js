const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

router.get("/listings/:id/book", isLoggedIn, wrapAsync(bookingController.renderBookingForm));
router.post("/listings/:id/book", isLoggedIn, wrapAsync(bookingController.createBooking));

router.post("/bookings/verify", isLoggedIn, wrapAsync(bookingController.verifyPayment));
router.get("/bookings/:id/success", isLoggedIn, wrapAsync(bookingController.bookingSuccess));
router.get("/bookings/cancel", isLoggedIn, wrapAsync(bookingController.paymentCancelled));

router.get("/my-trips", isLoggedIn, wrapAsync(bookingController.myTrips));
router.get("/host/bookings", isLoggedIn, wrapAsync(bookingController.hostBookings));

router.delete("/bookings/:id", isLoggedIn, wrapAsync(bookingController.cancelBooking));

module.exports = router;