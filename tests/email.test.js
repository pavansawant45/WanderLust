const sendMail = require("../utils/mailer");
const templates = require("../utils/emailTemplates");

const realFetch = global.fetch;
const saved = { key: process.env.BREVO_API_KEY, from: process.env.MAIL_FROM_EMAIL };

afterAll(() => {
    global.fetch = realFetch;
    process.env.BREVO_API_KEY = saved.key;
    process.env.MAIL_FROM_EMAIL = saved.from;
});

describe("sendMail", () => {
    beforeEach(() => {
        process.env.BREVO_API_KEY = "test-key";
        process.env.MAIL_FROM_EMAIL = "sender@example.com";
        jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it("posts to Brevo with the api-key header and the verified sender", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201 });
        const sent = await sendMail({ to: "guest@example.com", toName: "Guest", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

        expect(sent).toBe(true);
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe("https://api.brevo.com/v3/smtp/email");
        expect(options.headers["api-key"]).toBe("test-key");
        const body = JSON.parse(options.body);
        expect(body.sender.email).toBe("sender@example.com");
        expect(body.to[0].email).toBe("guest@example.com");
        expect(body.subject).toBe("Hi");
    });

    it("does nothing when email is not configured", async () => {
        process.env.BREVO_API_KEY = "";
        global.fetch = jest.fn();
        expect(await sendMail({ to: "a@example.com", subject: "x", html: "x", text: "x" })).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns false instead of throwing when Brevo rejects the request", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
        expect(await sendMail({ to: "a@example.com", subject: "x", html: "x", text: "x" })).toBe(false);
    });

    it("returns false instead of throwing when the network fails", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
        expect(await sendMail({ to: "a@example.com", subject: "x", html: "x", text: "x" })).toBe(false);
    });
});

describe("email templates", () => {
    it("escapes user-controlled text in the HTML", () => {
        const { html } = templates.welcome({ username: "<script>alert(1)</script>" });
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("booking confirmation mentions the listing and the total", () => {
        const { subject, html } = templates.bookingConfirmed({
            guestName: "Asha", title: "Cozy Cottage", location: "Pune", country: "India",
            checkIn: "2027-01-10", checkOut: "2027-01-12", nights: 2, guests: 2, total: 2000,
        });
        expect(subject).toContain("Cozy Cottage");
        expect(html).toContain("₹2,000");
    });
});