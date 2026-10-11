const mongoose = require("mongoose");

const marketplaceProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ["food", "handicrafts", "agri", "other"], default: "other" },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  price: { type: Number, required: true, min: 0, max: 10000000 },
  icon: { type: String, trim: true, maxlength: 12, default: "🧺" },
  mark: { type: String, trim: true, maxlength: 40, default: "NHG made" },
  nhgName: { type: String, trim: true, required: true },
  nhgId: { type: String, trim: true, default: "" },
  secretary: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Active", "Paused"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.models.MarketplaceProduct || mongoose.model("MarketplaceProduct", marketplaceProductSchema);
