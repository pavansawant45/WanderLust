const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const User = require("../models/user");

async function hasOverlap(listingId, checkIn, checkOut) {
    return Booking.findOne({
        listing: listingId,
        status: { $ne: "cancelled" },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
    });
}

describe("Booking overlap prevention", () => {
    let listing, owner, guest;

    beforeAll(async () => {
        require('dotenv').config();
        process.env.ATLASDB_URL = process.env.MONGO_TEST_URL;
        await mongoose.connect(process.env.ATLASDB_URL);

        owner = await User.register(new User({ username: `owner_${Date.now()}`, email: `o_${Date.now()}@test.com` }), "Password123");
        guest = await User.register(new User({ username: `guest_${Date.now()}`, email: `g_${Date.now()}@test.com` }), "Password123");

        listing = await Listing.create({
            title: "Overlap Test Listing",
            description: "test",
            price: 1000,
            location: "Pune",
            country: "India",
            category: "Rooms",
            owner: owner._id,
            image: { url: "http://example.com/x.jpg", filename: "x" }
        });

        await Booking.create({
            listing: listing._id,
            guest: guest._id,
            checkIn: new Date("2026-12-10"),
            checkOut: new Date("2026-12-15"),
            totalPrice: 5000,
            status: "confirmed"
        });
    });

    afterAll(async () => {
        await Booking.deleteMany({ listing: listing._id });
        await Listing.findByIdAndDelete(listing._id);
        await User.findByIdAndDelete(owner._id);
        await User.findByIdAndDelete(guest._id);
        await mongoose.connection.close();
    });

    it("detects an overlapping date range", async () => {
        const result = await hasOverlap(listing._id, new Date("2026-12-12"), new Date("2026-12-18"));
        expect(result).not.toBeNull();
    });

    it("allows a non-overlapping date range", async () => {
        const result = await hasOverlap(listing._id, new Date("2026-12-20"), new Date("2026-12-25"));
        expect(result).toBeNull();
    });

    it("ignores cancelled bookings when checking overlap", async () => {
        await Booking.updateMany({ listing: listing._id }, { status: "cancelled" });
        const result = await hasOverlap(listing._id, new Date("2026-12-12"), new Date("2026-12-18"));
        expect(result).toBeNull();
    });
});