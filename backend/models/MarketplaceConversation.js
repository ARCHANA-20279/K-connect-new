const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: { type: String, trim: true, required: true },
  senderRole: { type: String, enum: ["member", "secretary"], required: true },
  body: { type: String, trim: true, required: true, maxlength: 2000 },
  readBy: [{ userId: { type: String }, readAt: { type: Date, default: Date.now } }],
}, { timestamps: { createdAt: true, updatedAt: false } });

const marketplaceConversationSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceProduct", required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  secretary: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  nhgName: { type: String, trim: true, required: true },
  nhgId: { type: String, trim: true, default: "" },
  messages: { type: [messageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

marketplaceConversationSchema.index({ product: 1, member: 1 }, { unique: true });

module.exports = mongoose.models.MarketplaceConversation || mongoose.model("MarketplaceConversation", marketplaceConversationSchema);
