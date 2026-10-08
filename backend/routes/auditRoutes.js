const express = require("express");
const { getReconciledSummary, saveAudit, getAudits, generateCdsAuditReport } = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Real-time financial calculations
router.get("/summary", getReconciledSummary);

// Restricted, ward-filtered PDF export for CDS officers.
router.get("/cds-report.pdf", protect, authorize("cds_officer"), generateCdsAuditReport);

// Only Secretary can certify and save formal audit
router.post("/", protect, authorize("secretary"), saveAudit);

// View verified audits
router.get("/", getAudits);

module.exports = router;
