const express = require("express");
const { getReconciledSummary, saveAudit, getAudits } = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Real-time financial calculations
router.get("/summary", getReconciledSummary);

// Only Secretary can certify and save formal audit
router.post("/", protect, authorize("secretary"), saveAudit);

// View verified audits
router.get("/", getAudits);

module.exports = router;
