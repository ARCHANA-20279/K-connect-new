const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    meetingNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      trim: true,
    },
    time: {
      type: String, // e.g. "04:30 PM"
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      min: 15,
      default: 60,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    chairperson: {
      type: String,
      trim: true,
      default: "NHG President / Secretary",
    },
    agenda: {
      type: String,
      trim: true,
      default: "Weekly thrift collection, microfinance review, and community affairs.",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    minutes: {
      type: String,
      trim: true,
      default: "",
    },
    minutesDraft: {
      type: String,
      trim: true,
      default: "",
    },
    totalAttendees: {
      type: Number,
      default: 0,
    },
    attendanceToken: {
      type: String,
      trim: true,
      default: "",
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

module.exports = mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
