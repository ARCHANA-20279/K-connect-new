const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["MEETING", "ATTENDANCE", "ANNOUNCEMENT", "LOAN", "CIRCULAR", "AUDIT", "JOB"],
      default: "CIRCULAR",
    },
    recipientRole: {
      type: String,
      enum: ["all", "member", "secretary", "nhg_secretary", "ads_officer", "cds_officer", "ads_cds_officer", "bank_officer", "main_admin"],
      default: "all",
    },
    targetAudience: {
      type: String,
      default: "All Kudumbashree NHGs",
    },
    issuingAuthority: {
      type: String,
      default: "Panchayath CDS Office",
      trim: true,
    },
    category: {
      type: String,
      default: "Auditing Notice",
      trim: true,
    },
    circularNo: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      default: "CDS / ADS Officer",
      trim: true,
    },
    relatedMeeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
    },
    relatedLoan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobAllocation",
    },
    recipientMemberId: {
      type: String,
      trim: true,
      default: "",
    },
    nhgId: {
      type: String,
      trim: true,
    },
    nhgName: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
