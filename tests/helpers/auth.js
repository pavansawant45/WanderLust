const request = require("supertest");

async function registerAndLogin(app, overrides = {}) {
    const agent = request.agent(app); // keeps cookies between requests, like a real browser session
    const user = {
        username: overrides.username || `testuser_${Date.now()}`,
        email: overrides.email || `test_${Date.now()}@example.com`,
        password: overrides.password || "Password123",
    };

    await agent.post("/signup").type("form").send(user);
    return { agent, user };
}

module.exports = { registerAndLogin };