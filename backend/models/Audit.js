const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    financialYear: {
      type: String,
      required: true,
      default: "2025-2026",
    },
    auditDate: {
      type: String,
      required: true,
    },
    totalThriftReceipts: {
      type: Number,
      required: true,
      default: 0,
    },
    totalLoanDisbursements: {
      type: Number,
      required: true,
      default: 0,
    },
    totalLoanRepayments: {
      type: Number,
      required: true,
      default: 0,
    },
    cashInHand: {
      type: Number,
      default: 0,
    },
    bankBalance: {
      type: Number,
      default: 0,
    },
    auditorName: {
      type: String,
      default: "CDS Internal Audit Committee",
    },
    remarks: {
      type: String,
      default: "Accounts reconciled and found in order as per Kudumbashree guidelines.",
    },
    status: {
      type: String,
      enum: ["Draft", "Verified", "Certified"],
      default: "Verified",
    },
    verifiedBy: {
      type: String,
      default: "Secretary",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Audit || mongoose.model("Audit", auditSchema);
