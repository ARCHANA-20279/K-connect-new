const mongoose = require("mongoose");

const thriftSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: String,
      required: true,
    },
    weekNumber: {
      type: Number,
      default: 1,
    },
    receiptNumber: {
      type: String,
      unique: true,
      required: true,
    },
    collectedBy: {
      type: String,
      default: "Secretary",
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank"],
      default: "Cash",
    },
    remarks: {
      type: String,
      default: "Weekly Thrift Deposit",
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

module.exports = mongoose.models.Thrift || mongoose.model("Thrift", thriftSchema);
