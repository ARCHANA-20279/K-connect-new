const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { getListings, createListing, updateListing, deleteListing } = require("../controllers/enterpriseController");

const router = express.Router();
router.get("/", protect, authorize("main_admin", "super_admin", "superadmin", "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer", "bank_officer"), getListings);
router.post("/", protect, authorize("secretary", "member"), createListing);
router.put("/:id", protect, authorize("main_admin", "super_admin", "superadmin", "secretary", "member"), updateListing);
router.delete("/:id", protect, authorize("main_admin", "super_admin", "superadmin", "secretary", "member"), deleteListing);
module.exports = router;
