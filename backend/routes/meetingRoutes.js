const express = require("express");
const {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  recordMinutes,
  saveMinutesDraft,
  deleteMeeting,
} = require("../controllers/meetingController");
const { protect, optionalProtect, authorize } = require("../middleware/auth");

const router = express.Router();

// Only registered Secretary can schedule meetings
router.post("/", protect, authorize("secretary"), createMeeting);

// Public / Members can view meetings (isolated by NHG if logged in)
router.get("/", optionalProtect, getMeetings);
router.get("/:id", getMeetingById);

// Only Secretary can update, record minutes, or delete meetings
router.put("/:id", protect, authorize("secretary"), updateMeeting);
router.patch("/:id/minutes", protect, authorize("secretary"), recordMinutes);
router.patch("/:id/minutes/draft", protect, authorize("secretary"), saveMinutesDraft);
router.delete("/:id", protect, authorize("secretary"), deleteMeeting);

module.exports = router;
