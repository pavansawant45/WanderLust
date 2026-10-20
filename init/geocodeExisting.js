require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const geocode = require("../utils/geocode");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
    await mongoose.connect(process.env.ATLASDB_URL);
        // Usage: node init/geocodeExisting.js            (fills in missing locations)
    //        node init/geocodeExisting.js "Costa Rica"  (redoes listings with that location)
    const redo = process.argv[2];
    const filter = redo ? { location: redo } : { "geometry.coordinates.1": { $exists: false } };
    const listings = await Listing.find(filter);

    console.log(`Looking up ${listings.length} listings...`);

    const missed = [];
    for (const l of listings) {
        const geometry = await geocode(l.location, l.country);
        if (geometry) {
            await Listing.updateOne({ _id: l._id }, { $set: { geometry } });
            console.log(`OK    ${l.title} -> ${geometry.coordinates}`);
        } else {
            missed.push(`${l.title} (${l.location}, ${l.country})`);
            console.log(`MISS  ${l.title}`);
        }
        await sleep(1100);   // Nominatim allows at most 1 request per second
    }

    console.log(`\nDone. ${listings.length - missed.length} found, ${missed.length} missed.`);
    if (missed.length) console.log("Missed:\n" + missed.join("\n"));

    await mongoose.disconnect();
})();