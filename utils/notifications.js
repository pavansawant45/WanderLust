const sendMail = require("./mailer");
const templates = require("./emailTemplates");
const Booking = require("../models/booking");

// Both functions catch their own errors, so callers can fire them and move on.
module.exports.notifyWelcome = async (user) => {
    try {
        const { subject, html, text } = templates.welcome({ username: user.username });
        await sendMail({ to: user.email, toName: user.username, subject, html, text });
    } catch (err) {
        console.error("Welcome email failed:", err.message);
    }
};

module.exports.notifyBookingConfirmed = async (bookingId) => {
    try {
        const booking = await Booking.findById(bookingId)
            .populate("guest")
            .populate({ path: "listing", populate: { path: "owner" } });
        if (!booking || !booking.guest || !booking.listing) return;

        const host = booking.listing.owner;
        const nights = Math.round((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        const info = {
            title: booking.listing.title,
            location: booking.listing.location,
            country: booking.listing.country,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights,
            guests: booking.guests,
            total: booking.totalPrice,
        };

        // To the guest
        const toGuest = templates.bookingConfirmed({ ...info, guestName: booking.guest.username });
        await sendMail({ to: booking.guest.email, toName: booking.guest.username, ...toGuest });

        // To the host (each person only sees the other's username, never their email)
        if (host && host.email) {
            const toHost = templates.newBookingForHost({ ...info, hostName: host.username, guestName: booking.guest.username });
            await sendMail({ to: host.email, toName: host.username, ...toHost });
        }
    } catch (err) {
        console.error("Booking emails failed:", err.message);
    }
};