const express = require("express");
const {
  createProgramme,
  getProgrammes,
  updateProgramme,
  deleteProgramme,
} = require("../controllers/programmeController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Only Secretary can schedule, update, or delete community programmes
router.post("/", protect, authorize("secretary"), createProgramme);
router.put("/:id", protect, authorize("secretary"), updateProgramme);
router.delete("/:id", protect, authorize("secretary"), deleteProgramme);

// Public / Members can view upcoming programmes
router.get("/", getProgrammes);

module.exports = router;
