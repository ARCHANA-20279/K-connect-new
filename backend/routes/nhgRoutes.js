const express = require("express");
const {
  registerNHG,
  getPendingNHGs,
  approveNHG,
  rejectNHG,
  getNHGs,
  getNHGById,
  getPublicNHGList,
  createNHG,
  updateNHG,
  toggleNHGStatus,
  deleteNHG,
  getPlatformStats,
  getSecretaries,
  assignSecretary,
} = require("../controllers/nhgController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// 1. Public NHG self-registration
router.post("/register", registerNHG);

// 2. Public active NHG list for dropdowns
router.get("/public-list", getPublicNHGList);

// 3. Main Admin platform statistics
router.get("/stats", protect, authorize("MAIN_ADMIN", "super_admin"), getPlatformStats);

// 4. Main Admin Pending NHG registrations
router.get("/pending", protect, authorize("MAIN_ADMIN", "super_admin"), getPendingNHGs);

// 5. Main Admin Approve / Reject NHG
router.patch("/:id/approve", protect, authorize("MAIN_ADMIN", "super_admin"), approveNHG);
router.patch("/:id/reject", protect, authorize("MAIN_ADMIN", "super_admin"), rejectNHG);

// 6. Main Admin Secretaries Directory & Assignment
router.get("/secretaries", protect, authorize("MAIN_ADMIN", "super_admin"), getSecretaries);
router.post("/assign-secretary", protect, authorize("MAIN_ADMIN", "super_admin"), assignSecretary);

// 7. General NHG CRUD operations
router.get("/", protect, getNHGs);
router.get("/:id", protect, getNHGById);
router.post("/", protect, authorize("MAIN_ADMIN", "super_admin"), createNHG);
router.put("/:id", protect, authorize("MAIN_ADMIN", "super_admin"), updateNHG);
router.patch("/:id/status", protect, authorize("MAIN_ADMIN", "super_admin"), toggleNHGStatus);
router.delete("/:id", protect, authorize("MAIN_ADMIN", "super_admin"), deleteNHG);

module.exports = router;
