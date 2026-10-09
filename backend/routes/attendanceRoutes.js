const express = require("express");
const {
  scanMeetingAttendance,
  getMeetingAttendance,
  generateMeetingToken,
  scanAttendance,
  getTodayAttendance,
  manualMarkAttendance,
  getAttendanceHistory,
  clearTodayAttendance,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// 1. Member scans meeting QR code (Logged-in member identity via JWT)
// Keep the role check inside the controller so non-member accounts receive a
// clear attendance-specific message instead of a generic permission error.
router.post("/scan-meeting", protect, scanMeetingAttendance);

// 2. Scan endpoint: intelligent router (handles meeting QR if authenticated or legacy member scan)
router.post("/scan", (req, res, next) => {
  if (req.headers.authorization && (req.body.qrData || req.body.meetingId)) {
    return protect(req, res, () => authorize("member")(req, res, () => scanMeetingAttendance(req, res, next)));
  }
  return scanAttendance(req, res, next);
});

// 3. Meeting specific attendance & QR token
router.get("/meeting/:meetingId", protect, getMeetingAttendance);
router.post("/meeting/:meetingId/token", protect, authorize("secretary"), generateMeetingToken);

// 4. Daily attendance & management routes
router.get("/today", getTodayAttendance);
router.post("/manual", protect, authorize("secretary"), manualMarkAttendance);
router.get("/history", getAttendanceHistory);
router.delete("/clear-today", protect, authorize("secretary"), clearTodayAttendance);
router.delete("/today", protect, authorize("secretary"), clearTodayAttendance);

module.exports = router;
