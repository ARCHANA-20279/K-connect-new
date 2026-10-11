const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  listLearningVideos,
  publishLearningVideo,
  deleteLearningVideo,
} = require("../controllers/learningVideoController");

const router = express.Router();
const adminRoles = ["main_admin", "super_admin", "superadmin"];

router.get("/", protect, authorize(...adminRoles, "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer"), listLearningVideos);
router.post("/", protect, authorize(...adminRoles), publishLearningVideo);
router.delete("/:id", protect, authorize(...adminRoles), deleteLearningVideo);

module.exports = router;
