const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const ExpressError = require("./utils/ExpressError.js");

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// A fresh random value per request, so only OUR inline scripts are allowed to run
module.exports.nonce = (req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
};

module.exports.helmetMiddleware = helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                (req, res) => `'nonce-${res.locals.nonce}'`,
                "https://cdn.jsdelivr.net",
                "https://checkout.razorpay.com",
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://plus.unsplash.com", "https://cdn.razorpay.com", "https://tile.openstreetmap.org", "https://cdn.jsdelivr.net"],
            frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            ...(isProd ? { upgradeInsecureRequests: [] } : {}),
        },
    },
    // Razorpay may open bank popups; this keeps them working
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
});

function hasOperatorKeys(value) {
    if (!value || typeof value !== "object") return false;
    return Object.keys(value).some(
        (k) => k.startsWith("$") || k.includes(".") || hasOperatorKeys(value[k])
    );
}

// Rejects bodies like { username: { "$ne": "" } } (NoSQL injection attempts)
module.exports.rejectOperatorKeys = (req, res, next) => {
    if (hasOperatorKeys(req.body)) {
        return next(new ExpressError(400, "Invalid input detected."));
    }
    next();
};

// General limit: 300 requests per 15 minutes per visitor
module.exports.globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) =>
        res.status(429).render("error.ejs", { message: "Too many requests. Please slow down and try again in a few minutes." }),
});

// Strict limit for login/signup: 10 attempts per 15 minutes
module.exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) => {
        req.flash("error", "Too many attempts. Please try again in 15 minutes.");
        res.redirect(req.path);
    },
});