require('dotenv').config();

const mongoose = require("mongoose");
const initData = require("./data");
const Listing = require("../models/listing.js");

const MONGO_URL = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(MONGO_URL);
}

main()
.then(() => {
    console.log("Connected to DB");
})
.catch((err) => {
    console.log("Error connecting to DB:", err);
})

const initDB = async () => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({ ...obj, owner: "6aae33aed7fc0568a4605cbe"}));
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
};

initDB();