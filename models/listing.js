const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const Booking = require("./booking.js");

const listingSchema = new Schema ({
    title: { 
        type: String,
        required: true
    },
    description: String,
    image: {
        url: String,
        filename: String
    },
    images: [
        {
            url: String,
            filename: String
        }
    ],
    price: Number,
    location: String,
    country: String,
    category: {
        type: String,
        enum: ["Trending", "Rooms", "Iconic Cities", "Mountains", "Castles", "Amazing Pools", "Camping", "Farms", "Arctic", "Domes"]
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref : "Review",
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref : "User",
    }
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if(listing) {
        await Review.deleteMany({_id: { $in: listing.reviews}});
        await Booking.deleteMany({ listing: listing._id });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;