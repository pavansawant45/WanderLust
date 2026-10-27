# WanderLust

An Airbnb-style marketplace where people can list places to stay, search and filter them, see them on a map, book them and pay online.

**Live demo:** https://wanderlust-0byy.onrender.com

> The demo runs on Render's free plan, so the first visit after a quiet period can take up to about 50 seconds while the server wakes up.
> Payments run in **Razorpay test mode**. No real money is ever charged (see [Try a test booking](#try-a-test-booking)).

## Features

**Browse and discover**
- 10 category filters (Rooms, Mountains, Amazing Pools, Castles and more)
- Keyword search with a country filter, backed by a MongoDB text index
- Pagination, and a layout that works on phones, tablets and desktops

**Listings and reviews**
- Create, edit and delete listings with up to 6 photos each (5 MB per photo, stored on Cloudinary)
- Photo carousel on every listing, and owner-only edit and delete controls
- Star-rated reviews (owners cannot review their own listings)

**Maps**
- A location map on every listing, and an all-listings map page that respects your filters
- Locations are looked up from the "city, country" text using OpenStreetMap's Nominatim service, and shown with Leaflet

**Booking and payments**
- Date validation and **double-booking prevention** for overlapping stays
- Razorpay Checkout (test mode), with the payment signature verified on the server and tied to the exact booking it was made for
- "My Trips" for guests and "My Bookings" for hosts, plus booking cancellation

**Email notifications**
- A welcome email, a booking confirmation for the guest and a new-booking alert for the host, sent through the Brevo API

**Security**
- Helmet security headers with a Content Security Policy that uses a fresh nonce on every request
- Rate limiting (general, plus a strict limit on login and signup attempts)
- Rejection of database-operator injection attempts in request bodies
- Secure, `httpOnly`, `sameSite` session cookies; salted and hashed passwords; Joi validation on forms
- Error pages that never show internal details in production

**Quality**
- 30 automated tests (Jest and Supertest) running against a separate test database
- GitHub Actions runs the whole test suite on every push

## Tech stack

| Area | Tools |
|---|---|
| Server | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Views | EJS, ejs-mate, Bootstrap 5 |
| Accounts | Passport (local strategy), connect-mongo sessions |
| Files | Multer, Cloudinary |
| Payments | Razorpay (test mode) |
| Email | Brevo transactional email API |
| Maps | Leaflet, OpenStreetMap tiles, Nominatim geocoding |
| Security | Helmet, express-rate-limit, Joi |
| Testing and CI | Jest, Supertest, GitHub Actions |
| Hosting | Render |

## Run it locally

You need Node.js 24 or newer and free accounts for MongoDB Atlas, Cloudinary and Razorpay (test mode). Brevo is optional: without it the app simply skips sending email.

```bash
git clone https://github.com/pavansawant45/WanderLust.git
cd WanderLust
npm install
```

Create a `.env` file in the project root:

| Variable | Needed for |
|---|---|
| `ATLASDB_URL` | MongoDB Atlas connection string |
| `SECRET` | Session secret (any long random string) |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Cloudinary image uploads |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay test-mode keys |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Email (optional) |
| `APP_URL` | Links inside emails (optional, defaults to `http://localhost:8000`) |
| `MONGO_TEST_URL` | A separate database used only by the tests |

Start the app:

```bash
npm start
```

Then open http://localhost:8000.

### Add sample listings (optional)

1. Run the app, sign up, and copy your user's `_id` from the `users` collection in MongoDB.
2. Put that `_id` in the `owner` field in `init/index.js`.
3. Run `node init/index.js`. **This deletes all existing listings** and loads the sample ones.
4. Run `node init/geocodeExisting.js` to give each sample listing a map location.

## Try a test booking

1. Sign up for an account and open a listing that belongs to someone else (you cannot book your own).
2. Choose dates and continue to payment.
3. In the Razorpay window, use the test card `4100 2800 0000 1007`, any future expiry date and any 3-digit CVV, then complete the mock bank step.

## Run the tests

```bash
npm test
```

The tests use `MONGO_TEST_URL`, never your real data. They never send real email, and the map and email tests fake their network calls.

## Project structure

```
app.js              Express app, sessions, security setup
security.js         Helmet, rate limiting and input checks
middleware.js       Login, ownership and validation checks
schema.js           Joi validation schemas
cloudConfig.js      Cloudinary storage settings
models/             Listing, Review, User, Booking
controllers/        Request handling for listings, reviews, users, bookings
routes/             URL routing
views/              EJS templates
utils/              Geocoding, email sending and email templates
init/               Seed and map-backfill scripts
tests/              Automated tests
.github/workflows/  CI configuration
```

## Known limitations

- Payments are in test mode only.
- Emails come from a free address through Brevo, so they may land in spam.
- Map pins show the general area of a listing, not an exact address, because they come from the city name.
- Rate-limit counters are kept in server memory, which is fine for a single server.

## Author

Built by Pavan Sawant ([@pavansawant45](https://github.com/pavansawant45)).
