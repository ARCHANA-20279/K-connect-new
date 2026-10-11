const express = require("express");
const {
  createMember,
  getMembers,
  updateMember,
  deactivateMember,
  approveMember,
  rejectMember,
} = require("../controllers/memberController");
const {
  getOwnMemberProfile,
  submitOwnProfileUpdate,
  getNHGProfileUpdateRequests,
  reviewProfileUpdateRequest,
} = require("../controllers/memberProfileController");
const { protect, optionalProtect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/me/profile", protect, authorize("member"), getOwnMemberProfile);
router.post("/me/profile-updates", protect, authorize("member"), submitOwnProfileUpdate);
router.get("/profile-updates", protect, authorize("secretary"), getNHGProfileUpdateRequests);
router.patch("/profile-updates/:requestId", protect, authorize("secretary"), reviewProfileUpdateRequest);

// Only Secretary can register, update, or deactivate members
router.post("/", protect, authorize("secretary"), createMember);
router.put("/:id", protect, authorize("secretary"), updateMember);
router.put("/:id/deactivate", protect, authorize("secretary"), deactivateMember);
router.put("/:id/approve", protect, authorize("secretary"), approveMember);
router.put("/:id/reject", protect, authorize("secretary"), rejectMember);

// Members and directory viewers can read member list (isolated by NHG if logged in)
router.get("/", optionalProtect, getMembers);

module.exports = router;
