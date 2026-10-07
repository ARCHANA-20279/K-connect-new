const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      trim: true,
    },

    memberName: {
      type: String,
      required: true,
      trim: true,
    },

    loanType: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    applicationDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Pending", "ADS Review", "CDS Review", "Bank Review", "Bank Approved", "Repayment", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },

    secretaryReview: {
      eligible: { type: Boolean, default: null },
      meetingResolution: { type: String, trim: true, default: "" },
      remarks: { type: String, trim: true, default: "" },
      reviewedBy: { type: String, trim: true, default: "" },
      reviewedAt: { type: Date },
    },

    workflowHistory: [{
      stage: { type: String, required: true },
      decision: { type: String, required: true },
      actor: { type: String, default: "" },
      actorRole: { type: String, default: "" },
      reference: { type: String, default: "" },
      remarks: { type: String, default: "" },
      at: { type: Date, default: Date.now },
    }],

    bankDecision: {
      reference: { type: String, trim: true, default: "" },
      disbursementReference: { type: String, trim: true, default: "" },
      decidedBy: { type: String, trim: true, default: "" },
      decidedAt: { type: Date },
      disbursedAt: { type: Date },
      bankInterestRate: { type: Number, min: 0, default: null },
      paymentScheduleReference: { type: String, trim: true, default: "" },
    },

    subsidyRate: { type: Number, min: 0, default: 5 },

    repayments: [{
      amount: { type: Number, required: true, min: 0.01 },
      paymentDate: { type: Date, required: true },
      dueDate: { type: Date },
      receiptReference: { type: String, trim: true, default: "" },
      status: { type: String, enum: ["Submitted", "Verified", "Rejected"], default: "Submitted" },
      onTime: { type: Boolean, default: null },
      subsidyReview: { type: String, default: "Not reviewed" },
      recordedBy: { type: String, default: "" },
      verifiedBy: { type: String, default: "" },
      verifiedAt: { type: Date },
      remarks: { type: String, default: "" },
    }],

    approvedAmount: {
      type: Number,
      default: 0,
    },

    repaymentAmount: {
      type: Number,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      default: 0,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    sanctionDate: {
      type: Date,
    },

    interestRate: {
      type: Number,
      default: 0,
    },

    installmentsCount: {
      type: Number,
      default: 10, // 10 weekly installments
    },
    loanId: {
      type: String,
      trim: true,
    },
    nhgName: {
      type: String,
      trim: true,
      default: "Ward 15 Ayalkoottam",
    },
    nhgId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Loan", loanSchema);
