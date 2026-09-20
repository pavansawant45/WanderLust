const Listing = require("../models/listing");

module.exports.index = async (req,res) => {
    let { category, country, search } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (country) filter.country = country;
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } },
        ];
    }

    const allListings = await Listing.find(filter);
    res.render("listings/index.ejs", {
        allListings,
        category: category || "",
        country: country || "",
        search: search || ""
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
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    if(req.files && req.files.length > 0) {
        listing.image = { url: req.files[0].path, filename: req.files[0].filename };
        listing.images = req.files.slice(1).map(f => ({ url: f.path, filename: f.filename }));
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req,res) => {
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}