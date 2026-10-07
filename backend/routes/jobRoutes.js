const express = require("express");
const { createJob, getJobs, respondToJob, reassignJob, deleteJob } = require("../controllers/jobController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Only Secretary can allocate new tasks or delete
router.post("/", protect, authorize("secretary"), createJob);
router.delete("/:id", protect, authorize("secretary"), deleteJob);

// Members see only their own assignments; Secretaries see their NHG's jobs.
router.get("/", protect, authorize("secretary", "member"), getJobs);

router.patch("/:id/respond", protect, authorize("member"), respondToJob);
router.patch("/:id/reassign", protect, authorize("secretary"), reassignJob);

module.exports = router;
