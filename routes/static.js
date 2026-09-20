const express = require("express");
const router = express.Router();

const pages = {
    "/privacy": { title: "Privacy Policy", body: "We respect your privacy. WanderLust only collects the information needed to run listings, bookings, and reviews, and never sells your data to third parties." },
    "/terms": { title: "Terms of Service", body: "By using WanderLust you agree to list and book accommodations in good faith, keep your account credentials secure, and follow local laws for any stay you host or book." },
    "/about": { title: "About WanderLust", body: "WanderLust is a community marketplace where people can list, discover, and book unique stays around the world." },
    "/contact": { title: "Contact Us", body: "Questions or feedback? Reach us at support@wanderlust.example and we'll get back to you shortly." },
};

Object.keys(pages).forEach((path) => {
    router.get(path, (req, res) => {
        res.render("static.ejs", pages[path]);
    });
});

module.exports = router;