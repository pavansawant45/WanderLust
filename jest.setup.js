require('dotenv').config();
process.env.NODE_ENV = "test";
process.env.ATLASDB_URL = process.env.MONGO_TEST_URL;