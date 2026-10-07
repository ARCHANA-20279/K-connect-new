const express = require("express");
const {
  getNotifications,
  createCircular,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getMemberRecipients,
} = require("../controllers/notificationController");
const { protect, optionalProtect, authorize } = require("../middleware/auth");

const router = express.Router();

// Read access for everyone (Secretary, Members, Officers)
router.get("/", optionalProtect, getNotifications);
router.get("/recipients", getMemberRecipients);

// ADS / CDS Officers can publish and manage official community notices.
router.post("/", protect, authorize("ads_officer", "cds_officer", "ads_cds_officer"), createCircular);
router.delete("/:id", protect, authorize("ads_officer", "cds_officer", "ads_cds_officer"), deleteNotification);

// Read receipts
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
