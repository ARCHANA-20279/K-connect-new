const EnterpriseListing = require("../models/EnterpriseListing");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Member = require("../models/Member");

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

const createBazaarInquiry = async (req, res) => {
  try {
    const productName = String(req.body.productName || "").trim();
    const price = Number(req.body.price);
    if (!productName || productName.length > 120 || !Number.isFinite(price) || price < 0 || price > 10000000) {
      return res.status(400).json({ message: "Choose a valid product before contacting its NHG." });
    }
    const user = req.user;
    if (!user.nhgId && !user.nhgName) {
      return res.status(400).json({ message: "Your account is not linked to an NHG, so we cannot route this inquiry." });
    }
    const nhgFilter = user.nhgId
      ? { nhgId: user.nhgId }
      : { nhgName: user.nhgName };
    const secretary = await User.findOne({
      role: { $in: ["NHG_SECRETARY", "nhg_secretary", "secretary"] },
      ...nhgFilter,
    }).select("_id");
    if (!secretary) {
      return res.status(404).json({ message: "No Secretary account is assigned to your NHG yet. Please contact your NHG Secretary directly." });
    }

    const memberRecord = user.memberId
      ? await Member.findOne({ memberId: user.memberId }).select("phone")
      : null;
    const contact = user.phone || memberRecord?.phone || user.email || "the member's K-Connect account";
    const nhgName = user.nhgName || "your NHG";
    await Notification.create({
      type: "BAZAAR_INQUIRY",
      title: `K-Bazaar inquiry: ${productName}`,
      message: `${user.name || "A member"} (${user.memberId || "member"}) from ${nhgName} is interested in ${productName} (₹${price.toLocaleString("en-IN")}). Please contact them at ${contact}.`,
      recipientRole: "secretary",
      targetAudience: `NHG Secretary — ${nhgName}`,
      issuingAuthority: "K-Bazaar",
      category: "Product inquiry",
      createdBy: user.name || "K-Connect member",
      nhgId: user.nhgId || undefined,
      nhgName: user.nhgName || undefined,
    });
    return res.status(201).json({
      message: `Your interest was sent to the ${nhgName} Secretary. They will contact you using the phone or email on your member account.`,
    });
  } catch (error) {
    console.error("K-Bazaar inquiry error:", error);
    return res.status(500).json({ message: "Could not send your inquiry to the NHG Secretary. Please try again." });
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

module.exports = { getListings, createListing, createBazaarInquiry, updateListing, deleteListing };
