const EnterpriseListing = require("../models/EnterpriseListing");

const isAdmin = (user) => ["main_admin", "super_admin", "superadmin"].includes((user?.role || "").toLowerCase());
const sameNhg = (listing, user) => (user?.nhgId && listing.nhgId === user.nhgId) || (user?.nhgName && listing.nhgName === user.nhgName);

const getListings = async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const filter = { status: "Active" };
    if (!isAdmin(req.user) && !["cds_officer", "ads_officer", "ads_cds_officer"].includes(role)) {
      const scope = [];
      if (req.user.nhgId) scope.push({ nhgId: req.user.nhgId });
      if (req.user.nhgName) scope.push({ nhgName: req.user.nhgName });
      if (scope.length) filter.$or = scope;
      else filter.owner = req.user._id;
    }
    const listings = await EnterpriseListing.find(filter).populate("owner", "name").sort({ createdAt: -1 });
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ message: "Could not load enterprise listings." });
  }
};

const createListing = async (req, res) => {
  try {
    const { title, category, description, contactName, contactPhone, location } = req.body;
    if (![title, category, description].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ message: "Business name, category, and description are required." });
    }
    const listing = await EnterpriseListing.create({
      title: title.trim(), category: category.trim(), description: description.trim(),
      contactName: String(contactName || "").trim(), contactPhone: String(contactPhone || "").trim(), location: String(location || "").trim(),
      nhgName: req.user.nhgName || "", nhgId: req.user.nhgId || "", owner: req.user._id,
    });
    res.status(201).json({ listing });
  } catch (error) {
    res.status(500).json({ message: "Could not save the enterprise listing." });
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await EnterpriseListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found." });
    if (String(listing.owner) !== String(req.user._id) && !isAdmin(req.user) && !sameNhg(listing, req.user)) return res.status(403).json({ message: "You cannot edit this listing." });
    for (const field of ["title", "category", "description", "contactName", "contactPhone", "location", "status"]) {
      if (req.body[field] !== undefined) listing[field] = String(req.body[field]).trim();
    }
    await listing.save();
    res.json({ listing });
  } catch (error) {
    res.status(400).json({ message: "Could not update the enterprise listing." });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await EnterpriseListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found." });
    if (String(listing.owner) !== String(req.user._id) && !isAdmin(req.user) && !sameNhg(listing, req.user)) return res.status(403).json({ message: "You cannot remove this listing." });
    await listing.deleteOne();
    res.json({ message: "Listing removed." });
  } catch (error) {
    res.status(500).json({ message: "Could not remove the enterprise listing." });
  }
};

module.exports = { getListings, createListing, updateListing, deleteListing };
