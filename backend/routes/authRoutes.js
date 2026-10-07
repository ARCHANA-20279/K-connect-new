const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, forgotPassword, createDemoBankOfficer } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/demo-bank-officers", protect, authorize("main_admin", "super_admin", "superadmin"), createDemoBankOfficer);
router.get("/profile", protect, getProfile);

module.exports = router;
