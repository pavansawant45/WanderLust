const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Security", () => {
    it("sends security headers and hides X-Powered-By", async () => {
        const res = await request(app).get("/listings");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["content-security-policy"]).toContain("script-src");
    });

    it("rejects NoSQL operator injection in a login body", async () => {
        const res = await request(app)
            .post("/login")
            .send({ username: { $ne: "x" }, password: { $ne: "x" } });
        expect(res.status).toBe(400);
    });

    it("returns 404, not 500, for a malformed listing id", async () => {
        const res = await request(app).get("/listings/not-a-real-id");
        expect(res.status).toBe(404);
    });
});