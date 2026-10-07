const mongoose = require("mongoose");

const programmeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Community Health", "Skill Training", "Micro-Enterprise", "Environmental Drive", "Women Empowerment"],
      default: "Women Empowerment",
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      default: "10:00 AM",
    },
    venue: {
      type: String,
      required: true,
    },
    coordinator: {
      type: String,
      default: "Secretary",
    },
    budget: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Planned", "Ongoing", "Completed", "Postponed"],
      default: "Planned",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Programme || mongoose.model("Programme", programmeSchema);
