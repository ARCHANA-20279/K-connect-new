const mongoose = require("mongoose");

const learningVideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  category: { type: String, trim: true, maxlength: 60, default: "General" },
  language: { type: String, trim: true, maxlength: 30, default: "Malayalam" },
  videoUrl: { type: String, required: true, trim: true },
  embedUrl: { type: String, required: true, trim: true },
  published: { type: Boolean, default: true },
  postedBy: { type: String, default: "Main Admin" },
}, { timestamps: true });

module.exports = mongoose.models.LearningVideo || mongoose.model("LearningVideo", learningVideoSchema);
