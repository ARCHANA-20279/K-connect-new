const mongoose = require("mongoose");

const enterpriseListingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 700 },
  contactName: { type: String, trim: true, maxlength: 80, default: "" },
  contactPhone: { type: String, trim: true, maxlength: 20, default: "" },
  location: { type: String, trim: true, maxlength: 120, default: "" },
  nhgName: { type: String, trim: true, default: "" },
  nhgId: { type: String, trim: true, default: "" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Active", "Paused"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.models.EnterpriseListing || mongoose.model("EnterpriseListing", enterpriseListingSchema);
