const express = require("express");
const {
  createLoan,
  getMyCreditScore,
  castPeerVote,
  getAllLoans,
  getLoanById,
  secretaryReview,
  adsReview,
  cdsReview,
  recordBankDecision,
  rejectLoan,
  submitRepayment,
  verifyRepayment,
} = require("../controllers/loanController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("member"), createLoan);
router.get("/credit-score/me", protect, authorize("member"), getMyCreditScore);
router.post("/:id/peer-vote", protect, authorize("member"), castPeerVote);
router.get("/", protect, getAllLoans);
router.get("/:id", protect, getLoanById);

router.post("/:id/secretary-review", protect, authorize("secretary"), secretaryReview);
router.post("/:id/ads-review", protect, authorize("ads_officer", "ads_cds_officer"), adsReview);
router.post("/:id/cds-review", protect, authorize("cds_officer", "ads_cds_officer"), cdsReview);
router.post("/:id/bank-decision", protect, authorize("main_admin", "super_admin", "superadmin", "bank_officer"), recordBankDecision);
router.post("/:id/reject", protect, authorize("secretary", "ads_officer", "cds_officer", "ads_cds_officer", "main_admin", "super_admin", "superadmin", "bank_officer"), rejectLoan);

router.post("/:id/repayments", protect, authorize("member", "secretary"), submitRepayment);
router.put("/:id/repayments/:repaymentId/verify", protect, authorize("secretary"), verifyRepayment);

module.exports = router;
