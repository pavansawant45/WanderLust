const request = require("supertest");
const mongoose = require("mongoose");
const crypto = require("crypto");

jest.mock("../utils/notifications", () => ({
    notifyWelcome: jest.fn(),
    notifyBookingConfirmed: jest.fn(),
}));

const app = require("../app");
const notifications = require("../utils/notifications");
const { registerAndLogin } = require("./helpers/auth");
const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");

const sign = (orderId, paymentId) =>
    crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

let guestAgent, strangerAgent, guestDoc, listing;

const makeBooking = (orderId) =>
    Booking.create({
        listing: listing._id,
        guest: guestDoc._id,
        checkIn: new Date("2027-01-10"),
        checkOut: new Date("2027-01-12"),
        totalPrice: 2000,
        status: "pending",
        razorpayOrderId: orderId,
    });

beforeAll(async () => {
    const guest = await registerAndLogin(app);
    guestAgent = guest.agent;
    guestDoc = await User.findOne({ username: guest.user.username });

    const host = await registerAndLogin(app);
    const hostDoc = await User.findOne({ username: host.user.username });

    const stranger = await registerAndLogin(app);
    strangerAgent = stranger.agent;

    listing = await Listing.create({
        title: "Payment Test Listing", description: "test", price: 1000,
        location: "Pune", country: "India", category: "Rooms",
        owner: hostDoc._id, image: { url: "http://example.com/x.jpg", filename: "x" },
    });
});

afterAll(async () => {
    await Booking.deleteMany({ listing: listing._id });
    await Listing.findByIdAndDelete(listing._id);
    await User.deleteMany({ username: /^testuser_/ });
    await mongoose.connection.close();
});

beforeEach(() => notifications.notifyBookingConfirmed.mockClear());

describe("Payment verification", () => {
    it("rejects a valid signature that belongs to a different order", async () => {
        const booking = await makeBooking("order_REAL");
        const res = await guestAgent.post("/bookings/verify").send({
            razorpay_order_id: "order_CHEAP",
            razorpay_payment_id: "pay_1",
            razorpay_signature: sign("order_CHEAP", "pay_1"),
            bookingId: booking._id,
        });

        expect(res.status).toBe(400);
        expect((await Booking.findById(booking._id)).status).toBe("pending");
        expect(notifications.notifyBookingConfirmed).not.toHaveBeenCalled();
    });

    it("does not let another user confirm or cancel someone else's booking", async () => {
        const booking = await makeBooking("order_A");
        const res = await strangerAgent.post("/bookings/verify").send({
            razorpay_order_id: "order_A",
            razorpay_payment_id: "pay_2",
            razorpay_signature: sign("order_A", "pay_2"),
            bookingId: booking._id,
        });

        expect(res.status).toBe(404);
        expect((await Booking.findById(booking._id)).status).toBe("pending");
        expect(notifications.notifyBookingConfirmed).not.toHaveBeenCalled();
    });

    it("rejects a wrong signature", async () => {
        const booking = await makeBooking("order_B");
        const res = await guestAgent.post("/bookings/verify").send({
            razorpay_order_id: "order_B",
            razorpay_payment_id: "pay_3",
            razorpay_signature: "not-a-real-signature",
            bookingId: booking._id,
        });

        expect(res.status).toBe(400);
        expect((await Booking.findById(booking._id)).status).not.toBe("confirmed");
        expect(notifications.notifyBookingConfirmed).not.toHaveBeenCalled();
    });

    it("confirms a correct payment and sends the emails only once", async () => {
        const booking = await makeBooking("order_C");
        const payload = {
            razorpay_order_id: "order_C",
            razorpay_payment_id: "pay_4",
            razorpay_signature: sign("order_C", "pay_4"),
            bookingId: booking._id,
        };

        const first = await guestAgent.post("/bookings/verify").send(payload);
        expect(first.status).toBe(200);
        expect(first.body.success).toBe(true);
        expect((await Booking.findById(booking._id)).status).toBe("confirmed");
        expect(notifications.notifyBookingConfirmed).toHaveBeenCalledTimes(1);

        const second = await guestAgent.post("/bookings/verify").send(payload);   // a retry
        expect(second.status).toBe(200);
        expect(notifications.notifyBookingConfirmed).toHaveBeenCalledTimes(1);
    });
});