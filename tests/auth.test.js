const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/user");

afterAll(async () => {
    await User.deleteMany({ username: /^testuser_/ });
    await mongoose.connection.close();
});

describe("Auth", () => {
    const username = `testuser_${Date.now()}`;
    const password = "Password123";

    it("signs up a new user and redirects to /listings", async () => {
        const res = await request(app)
            .post("/signup")
            .type("form")
            .send({ username, email: `${username}@example.com`, password });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/listings");
    });

    it("rejects signup with a duplicate username", async () => {
        const res = await request(app)
            .post("/signup")
            .type("form")
            .send({ username, email: `${username}2@example.com`, password });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/signup");
    });

    it("logs in with correct credentials", async () => {
        const res = await request(app)
            .post("/login")
            .type("form")
            .send({ username, password });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/listings");
    });

    it("rejects login with the wrong password", async () => {
        const res = await request(app)
            .post("/login")
            .type("form")
            .send({ username, password: "wrongpassword" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });
});