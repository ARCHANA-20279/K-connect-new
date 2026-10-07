const mongoose = require("mongoose");

const nhgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ward: {
      type: String,
      required: true,
      trim: true,
      default: "15",
    },
    panchayath: {
      type: String,
      trim: true,
      default: "Kudumbashree CDS",
    },
    nhgId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: "Kannur",
    },
    localBodyType: {
      type: String,
      enum: ["Grama Panchayat", "Municipality", "Corporation"],
      default: "Grama Panchayat",
    },
    localBodyName: {
      type: String,
      trim: true,
      default: "",
    },
    cdsName: {
      type: String,
      trim: true,
      default: "",
    },
    adsName: {
      type: String,
      trim: true,
      default: "",
    },
    presidentName: {
      type: String,
      trim: true,
      default: "",
    },
    secretaryName: {
      type: String,
      trim: true,
      default: "",
    },
    secretaryEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    secretaryPhone: {
      type: String,
      trim: true,
      default: "",
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Active", "Rejected", "Inactive"],
      default: "Pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    formationDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.NHG || mongoose.model("NHG", nhgSchema);
