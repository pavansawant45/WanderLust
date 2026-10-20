require('dotenv').config();
process.env.NODE_ENV = "test";
process.env.ATLASDB_URL = process.env.MONGO_TEST_URL;

// Tests must never send real emails, even if your .env has Brevo keys
process.env.BREVO_API_KEY = "";
process.env.MAIL_FROM_EMAIL = "";