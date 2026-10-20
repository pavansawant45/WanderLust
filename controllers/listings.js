const Listing = require("../models/listing");
const geocode = require("../utils/geocode");

function buildFilter({ category, country, search }) {
    const filter = {};
    if (typeof category === "string" && category) filter.category = category;
    if (typeof country === "string" && country) filter.country = country;
    if (typeof search === "string" && search) filter.$text = { $search: search };
    return filter;
}

module.exports.index = async (req,res) => {
    const { category, country, search, page } = req.query;
    const filter = buildFilter(req.query);

    const limit = 9;
    const currentPage = Math.max(parseInt(page) || 1, 1);
    const skip = (currentPage - 1) * limit;

    let listingsQuery = Listing.find(filter);
    if (filter.$text) {
        listingsQuery = listingsQuery
            .select({ score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } });
    }

    const [allListings, totalCount] = await Promise.all([
        listingsQuery.skip(skip).limit(limit),
        Listing.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.render("listings/index.ejs", {
        allListings,
        category: category || "",
        country: country || "",
        search: search || "",
        currentPage,
        totalPages
    });
}

module.exports.mapView = async (req,res) => {
    const { category, country, search } = req.query;
    const filter = buildFilter(req.query);
    filter["geometry.coordinates.1"] = { $exists: true };   // only listings that have a location

    const listings = await Listing.find(filter).select("title price geometry").limit(500);

    const pins = listings.map((l) => ({
        id: l._id,
        title: l.title,
        price: l.price,
        lng: l.geometry.coordinates[0],
        lat: l.geometry.coordinates[1],
    }));

    res.render("listings/map.ejs", {
        pins,
        category: typeof category === "string" ? category : "",
        country: typeof country === "string" ? country : "",
        search: typeof search === "string" ? search : "",
    });
}

module.exports.renderNewForm = (req,res) => {    
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req,res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews", populate:{ path: "author"}}).populate("owner");
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", {listing});
}

module.exports.createListing = async (req,res,next) => {
    if(!req.files || req.files.length === 0) {
        req.flash("error", "Please upload at least one image!");
        return res.redirect("/listings/new");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    // first uploaded file = cover image, rest = gallery
    newListing.image = { url: req.files[0].path, filename: req.files[0].filename };
    newListing.images = req.files.slice(1).map(f => ({ url: f.path, filename: f.filename }));

    const geometry = await geocode(req.body.listing.location, req.body.listing.country);
    if (geometry) newListing.geometry = geometry;

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req,res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageURL = listing.image.url;
    originalImageURL = originalImageURL.replace("/upload" , "/upload/w_250");
    res.render("listings/edit.ejs", {listing , originalImageURL});
}

module.exports.updateListing = async (req,res) => {
    let {id} = req.params;
    // findByIdAndUpdate returns the listing as it was BEFORE the update,
    // so we can compare the old location with the new one
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    const { location, country } = req.body.listing;
    const hasCoords = listing.geometry && listing.geometry.coordinates && listing.geometry.coordinates.length === 2;
    if (!hasCoords || listing.location !== location || listing.country !== country) {
        const geometry = await geocode(location, country);
        if (geometry) listing.geometry = geometry;
    }

    if(req.files && req.files.length > 0) {
        listing.image = { url: req.files[0].path, filename: req.files[0].filename };
        listing.images = req.files.slice(1).map(f => ({ url: f.path, filename: f.filename }));
    }

    await listing.save();   // saves only what changed

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req,res) => {
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}