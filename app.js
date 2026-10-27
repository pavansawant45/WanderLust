if(process.env.NODE_ENV != "production") {
   require('dotenv').config()
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const {MongoStore} = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const Listing = require("./models/listing.js");
const staticRouter = require("./routes/static.js");
const bookingRouter = require("./routes/booking.js");
const { nonce, helmetMiddleware, rejectOperatorKeys, globalLimiter, authLimiter } = require("./security.js");


const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");


const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
.then(() => {
    console.log("Connected to DB");
})
.catch((err) => {
    console.log("Error connecting to DB:", err);
    if (process.env.NODE_ENV === "production") {
        process.exit(1);   // fail loudly so Render restarts the service and shows the problem
    }
})

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Render sits behind a proxy; needed for real visitor IPs and secure cookies
}
app.use(nonce);
app.use(helmetMiddleware);
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 
app.use(rejectOperatorKeys);
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.engine('ejs', ejsMate);

const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto: {
        secret : process.env.SECRET
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    },
}

// app.get("/", (req, res) => {
//     res.send("Welcome to the home page!");
// });



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

app.use(async (req,res,next) => {
    res.locals.countries = await Listing.distinct("country");
    next();
});

app.use("/", staticRouter);

// app.get("/demouser", async (req,res) =>{
//     let fakeUser = new User({
//         email: "pavan123@gmail.com",
//         username: "pavan"
//     });
//     let registeredUser = await User.register(fakeUser, "HelloWorld");
//     res.send(registeredUser);
// })

app.use(globalLimiter);
app.post(["/login", "/signup"], authLimiter);

app.get("/", (req, res) => res.redirect("/listings"));
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", bookingRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err,req,res,next) =>{
    if (err.code === "LIMIT_FILE_SIZE") {
        err.statusCode = 400;
        err.message = "File too large! Each image must be under 5MB.";
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        err.statusCode = 400;
        err.message = "Too many images! You can upload up to 6 per listing.";
    }
    if (err.name === "CastError") {   // e.g. /listings/not-a-real-id
        err.statusCode = 404;
        err.message = "Page Not Found!";
    }
    
    let {statusCode = 500, message = "Something went wrong!"} = err;
    if (statusCode >= 500) {
        console.error(err);   // only log real server errors
    }
    if (statusCode >= 500 && process.env.NODE_ENV === "production") {
        message = "Something went wrong!";
    }
    res.status(statusCode).render("error.ejs", {message});
})

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || 8000;
    const onReady = () => console.log(`Server is listening on port ${port}`);
    if (process.env.NODE_ENV === "production") {
        app.listen(port, "0.0.0.0", onReady);   // Render needs all network interfaces
    } else {
        app.listen(port, onReady);
    }
}