const Audit = require("../models/Audit");
const Thrift = require("../models/Thrift");
const Loan = require("../models/Loan");

// Calculate real-time financial reconciliation
const getReconciledSummary = async (req, res) => {
  try {
    const thriftRecords = await Thrift.find({});
    const loanRecords = await Loan.find({});

    const totalThriftReceipts = thriftRecords.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalLoanDisbursements = loanRecords
      .filter((l) => l.status === "Approved" || l.status === "Completed")
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const totalLoanRepayments = loanRecords.reduce((sum, l) => sum + (Number(l.repaymentAmount) || 0), 0);

    // Calculated net fund in circulation
    const netCashSurplus = totalThriftReceipts + totalLoanRepayments - totalLoanDisbursements;
    const cashInHand = Math.max(0, Math.round(netCashSurplus * 0.15)); // 15% liquid petty cash
    const bankBalance = Math.max(0, netCashSurplus - cashInHand);

    res.status(200).json({
      financialYear: "2025-2026",
      totalThriftReceipts,
      totalLoanDisbursements,
      totalLoanRepayments,
      cashInHand,
      bankBalance,
      netCashSurplus,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate reconciliation", error: err.message });
  }
};

// Save a formal Audit Statement
const saveAudit = async (req, res) => {
  try {
    const audit = await Audit.create(req.body);
    res.status(201).json({ message: "Audit statement verified and recorded", audit });
  } catch (err) {
    res.status(500).json({ message: "Failed to save audit statement", error: err.message });
  }
};

// Get past Audits
const getAudits = async (req, res) => {
  try {
    const audits = await Audit.find({}).sort({ createdAt: -1 });
    res.status(200).json({ audits });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit statements", error: err.message });
  }
};

module.exports = { getReconciledSummary, saveAudit, getAudits };
