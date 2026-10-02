const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
const app = require("../app");
const { registerAndLogin } = require("./helpers/auth");
const Listing = require("../models/listing");
const User = require("../models/user");

afterAll(async () => {
    await Listing.deleteMany({ title: /^Test Listing/ });
    await User.deleteMany({ username: /^testuser_/ });
    await mongoose.connection.close();
});

describe("Listings", () => {
    it("blocks creating a listing when not logged in", async () => {
        const res = await request(app).post("/listings").field("listing[title]", "Nope");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("creates a listing when logged in, with an image upload", async () => {
        const { agent } = await registerAndLogin(app);

        const res = await agent
            .post("/listings")
            .field("listing[title]", "Test Listing")
            .field("listing[description]", "A lovely test place")
            .field("listing[category]", "Rooms")
            .field("listing[price]", "1000")
            .field("listing[country]", "India")
            .field("listing[location]", "Pune")
            .attach("listing[image]", path.join(__dirname, "fixtures/test-image.jpg"));

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/listings");

        const created = await Listing.findOne({ title: "Test Listing" });
        expect(created).not.toBeNull();
        expect(created.category).toBe("Rooms");
    });

    it("shows the listings index page", async () => {
        const res = await request(app).get("/listings");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Explore");
    });

    it("prevents a non-owner from editing someone else's listing", async () => {
        const { agent: ownerAgent } = await registerAndLogin(app);
        const createRes = await ownerAgent
            .post("/listings")
            .field("listing[title]", "Test Listing Owner Check")
            .field("listing[description]", "test")
            .field("listing[category]", "Rooms")
            .field("listing[price]", "500")
            .field("listing[country]", "India")
            .field("listing[location]", "Pune")
            .attach("listing[image]", path.join(__dirname, "fixtures/test-image.jpg"));

        const listing = await Listing.findOne({ title: "Test Listing Owner Check" });

        const { agent: otherAgent } = await registerAndLogin(app);
        const res = await otherAgent
            .put(`/listings/${listing._id}?_method=PUT`)
            .field("listing[title]", "Hacked Title")
            .field("listing[description]", "test")
            .field("listing[category]", "Rooms")
            .field("listing[price]", "500")
            .field("listing[country]", "India")
            .field("listing[location]", "Pune");

        const unchanged = await Listing.findById(listing._id);
        expect(unchanged.title).toBe("Test Listing Owner Check"); // was NOT changed
    });
});