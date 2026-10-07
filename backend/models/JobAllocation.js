const mongoose = require("mongoose");

const jobAllocationSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      trim: true,
      default: "",
    },
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Catering & Food", "Tailoring & Apparel", "Waste Management", "Organic Farming", "Event Management", "Loan Collection Duty"],
      default: "Catering & Food",
    },
    assignedMemberId: {
      type: String,
      required: true,
    },
    assignedMemberName: {
      type: String,
      required: true,
    },
    deadline: {
      type: String,
      required: true,
    },
    stipendAmount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Assigned", "Interested", "Not Interested", "In Progress", "Submitted", "Completed"],
      default: "Assigned",
    },
    assignedBy: {
      type: String,
      default: "Secretary",
    },
    nhgId: { type: String, trim: true, default: "" },
    nhgName: { type: String, trim: true, default: "" },
    assignmentGroupId: { type: String, trim: true, default: "" },
    declineReason: { type: String, trim: true, default: "" },
    completedAt: { type: Date },
    reassignedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.JobAllocation || mongoose.model("JobAllocation", jobAllocationSchema);
