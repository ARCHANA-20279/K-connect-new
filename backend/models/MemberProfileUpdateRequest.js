const mongoose = require("mongoose");

const memberProfileUpdateRequestSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    memberId: { type: String, required: true, trim: true, index: true },
    memberName: { type: String, required: true, trim: true },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nhgId: { type: String, trim: true, default: "" },
    nhgName: { type: String, trim: true, default: "" },
    proposedChanges: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    reviewNote: { type: String, trim: true, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

memberProfileUpdateRequestSchema.index({ member: 1, status: 1 });

module.exports = mongoose.models.MemberProfileUpdateRequest ||
  mongoose.model("MemberProfileUpdateRequest", memberProfileUpdateRequestSchema);
