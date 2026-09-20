const crypto = require("crypto");
const Razorpay = require("razorpay");
const Listing = require("../models/listing");
const Booking = require("../models/booking");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports.renderBookingForm = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if(!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    if(listing.owner.equals(req.user._id)) {
        req.flash("error", "You can't book your own listing!");
        return res.redirect(`/listings/${listing._id}`);
    }
    res.render("bookings/new.ejs", { listing });
};

module.exports.createBooking = async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut, guests } = req.body;

    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    if(listing.owner.equals(req.user._id)) {
        req.flash("error", "You can't book your own listing!");
        return res.redirect(`/listings/${id}`);
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0,0,0,0);

    if(checkInDate >= checkOutDate) {
        req.flash("error", "Check-out date must be after check-in date.");
        return res.redirect(`/listings/${id}/book`);
    }
    if(checkInDate < today) {
        req.flash("error", "Check-in date cannot be in the past.");
        return res.redirect(`/listings/${id}/book`);
    }

    // Prevent double-booking
    const overlapping = await Booking.findOne({
        listing: id,
        status: { $ne: "cancelled" },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate }
    });

    if(overlapping) {
        req.flash("error", "This listing is already booked for some of the selected dates.");
        return res.redirect(`/listings/${id}/book`);
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * listing.price;

    const booking = new Booking({
        listing: listing._id,
        guest: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: guests || 1,
        totalPrice,
        status: "pending"
    });

    const order = await razorpay.orders.create({
        amount: totalPrice * 100, // Razorpay expects paise
        currency: "INR",
        receipt: `booking_${booking._id}`,
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    res.render("bookings/checkout.ejs", {
        booking,
        listing,
        order,
        keyId: process.env.RAZORPAY_KEY_ID,
    });
};

module.exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

    const isValid = expectedSignature === razorpay_signature;
    const booking = await Booking.findById(bookingId);

    if(!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if(isValid) {
        booking.status = "confirmed";
        booking.razorpayPaymentId = razorpay_payment_id;
        booking.razorpaySignature = razorpay_signature;
        await booking.save();
        return res.json({ success: true, redirectUrl: `/bookings/${booking._id}/success` });
    } else {
        booking.status = "cancelled";
        await booking.save();
        return res.status(400).json({ success: false, message: "Payment verification failed" });
    }
};

module.exports.bookingSuccess = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate("listing");
    if(!booking || booking.status !== "confirmed") {
        req.flash("error", "Booking could not be confirmed.");
        return res.redirect("/listings");
    }
    res.render("bookings/success.ejs", { booking });
};

module.exports.paymentCancelled = async (req, res) => {
    const { bookingId } = req.query;
    if(bookingId) {
        await Booking.findByIdAndUpdate(bookingId, { status: "cancelled" });
    }
    res.render("bookings/cancel.ejs");
};

module.exports.myTrips = async (req, res) => {
    const bookings = await Booking.find({ guest: req.user._id })
        .populate("listing")
        .sort({ checkIn: -1 });
    res.render("bookings/my-trips.ejs", { bookings });
};

module.exports.hostBookings = async (req, res) => {
    const myListings = await Listing.find({ owner: req.user._id }).select("_id");
    const listingIds = myListings.map(l => l._id);

    const bookings = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("guest")
        .sort({ checkIn: -1 });

    res.render("bookings/host.ejs", { bookings });
};

module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if(!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/my-trips");
    }
    if(!booking.guest.equals(req.user._id)) {
        req.flash("error", "You can only cancel your own bookings.");
        return res.redirect("/my-trips");
    }
    if(new Date(booking.checkIn) < new Date()) {
        req.flash("error", "Cannot cancel a booking that has already started.");
        return res.redirect("/my-trips");
    }

    booking.status = "cancelled";
    await booking.save();
    req.flash("success", "Booking cancelled.");
    res.redirect("/my-trips");
};