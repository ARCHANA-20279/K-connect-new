const MarketplaceProduct = require("../models/MarketplaceProduct");
const MarketplaceConversation = require("../models/MarketplaceConversation");
const { normalizeRole } = require("../middleware/auth");

const roleOf = (user) => normalizeRole(user?.role);
const isSecretary = (user) => roleOf(user) === "nhg_secretary";
const isMember = (user) => roleOf(user) === "member";
const categoryValues = ["food", "handicrafts", "agri", "other"];
const isSameNHG = (member, product) => {
  if (member?.nhgId && product?.nhgId) return String(member.nhgId).trim().toLowerCase() === String(product.nhgId).trim().toLowerCase();
  const memberName = String(member?.nhgName || "").trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const productName = String(product?.nhgName || "").trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return Boolean(memberName && productName && memberName === productName);
};

const getProducts = async (_req, res) => {
  try {
    const products = await MarketplaceProduct.find({ status: "Active" })
      .populate("secretary", "name")
      .sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: "Could not load K-Bazaar products." });
  }
};

const createProduct = async (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = String(req.body.category || "other").trim();
  const price = Number(req.body.price);
  const description = String(req.body.description || "").trim();
  if (!title || title.length > 120 || !categoryValues.includes(category) || !Number.isFinite(price) || price < 0 || price > 10000000) {
    return res.status(400).json({ message: "Enter a product name, valid category, and valid price." });
  }
  if (!req.user.nhgId && !req.user.nhgName) {
    return res.status(400).json({ message: "Your Secretary account must be linked to an NHG before posting products." });
  }
  try {
    const product = await MarketplaceProduct.create({
      title,
      category,
      price,
      description,
      icon: String(req.body.icon || "🧺").trim().slice(0, 12),
      mark: String(req.body.mark || "NHG made").trim().slice(0, 40),
      nhgName: req.user.nhgName || "NHG",
      nhgId: req.user.nhgId || "",
      secretary: req.user._id,
    });
    await product.populate("secretary", "name");
    res.status(201).json({ product, message: "Product is now visible in K-Bazaar." });
  } catch (error) {
    res.status(500).json({ message: "Could not publish this product." });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await MarketplaceProduct.findOne({ _id: req.params.productId, secretary: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found in your NHG listings." });
    const { title, category, description, price, icon, mark, status } = req.body || {};
    if (title !== undefined) product.title = String(title).trim();
    if (category !== undefined && categoryValues.includes(category)) product.category = category;
    if (description !== undefined) product.description = String(description).trim();
    if (price !== undefined && Number.isFinite(Number(price)) && Number(price) >= 0) product.price = Number(price);
    if (icon !== undefined) product.icon = String(icon).trim().slice(0, 12);
    if (mark !== undefined) product.mark = String(mark).trim().slice(0, 40);
    if (["Active", "Paused"].includes(status)) product.status = status;
    await product.save();
    await product.populate("secretary", "name");
    res.json({ product });
  } catch (error) {
    res.status(400).json({ message: "Could not update this product." });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await MarketplaceProduct.findOneAndDelete({ _id: req.params.productId, secretary: req.user._id });
    if (!product) return res.status(404).json({ message: "Product not found in your NHG listings." });
    res.json({ message: "Product removed from K-Bazaar." });
  } catch (error) {
    res.status(400).json({ message: "Could not remove this product." });
  }
};

const openConversation = async (req, res) => {
  if (!isMember(req.user)) return res.status(403).json({ message: "Only NHG members can contact a product Secretary." });
  try {
    const product = await MarketplaceProduct.findOne({ _id: req.params.productId, status: "Active" });
    if (!product) return res.status(404).json({ message: "This product is no longer available." });
    if (String(product.secretary) === String(req.user._id)) return res.status(400).json({ message: "You cannot message your own product listing." });
    if (isSameNHG(req.user, product)) {
      return res.status(403).json({ message: "Members can contact products listed by other NHGs. This product belongs to your NHG." });
    }
    let conversation = await MarketplaceConversation.findOne({ product: product._id, member: req.user._id });
    if (!conversation) {
      try {
        conversation = await MarketplaceConversation.create({
          product: product._id,
          member: req.user._id,
          secretary: product.secretary,
          nhgName: product.nhgName,
          nhgId: product.nhgId,
        });
      } catch (createError) {
        if (createError.code !== 11000) throw createError;
        conversation = await MarketplaceConversation.findOne({ product: product._id, member: req.user._id });
      }
    }
    await conversation.populate([{ path: "product" }, { path: "member", select: "name memberId" }, { path: "secretary", select: "name" }]);
    res.status(200).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: "Could not open a chat with this NHG Secretary." });
  }
};

const getConversations = async (req, res) => {
  if (!isMember(req.user) && !isSecretary(req.user)) return res.status(403).json({ message: "Chat access is for NHG members and secretaries." });
  try {
    const filter = isMember(req.user) ? { member: req.user._id } : { secretary: req.user._id };
    const conversations = await MarketplaceConversation.find(filter)
      .populate("product", "title price category icon mark status")
      .populate("member", "name memberId")
      .populate("secretary", "name")
      .sort({ lastMessageAt: -1 });
    const userId = String(req.user._id);
    const results = conversations.map((conversation) => {
      const item = conversation.toObject();
      item.unreadCount = item.messages.filter((message) => String(message.sender) !== userId && !message.readBy.some((read) => read.userId === userId)).length;
      item.lastMessage = item.messages[item.messages.length - 1] || null;
      return item;
    });
    res.json({ conversations: results });
  } catch (error) {
    res.status(500).json({ message: "Could not load your product chats." });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await MarketplaceConversation.findById(req.params.conversationId)
      .populate("product", "title price category icon mark status")
      .populate("member", "name memberId")
      .populate("secretary", "name");
    if (!conversation) return res.status(404).json({ message: "Chat not found." });
    if (![String(conversation.member._id), String(conversation.secretary._id)].includes(String(req.user._id))) {
      return res.status(403).json({ message: "This chat belongs to another member and NHG." });
    }
    const userId = String(req.user._id);
    conversation.messages.forEach((message) => {
      if (String(message.sender) !== userId && !message.readBy.some((read) => read.userId === userId)) {
        message.readBy.push({ userId, readAt: new Date() });
      }
    });
    await conversation.save();
    res.json({ conversation });
  } catch (error) {
    res.status(400).json({ message: "Could not load this product chat." });
  }
};

const sendMessage = async (req, res) => {
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 2000) return res.status(400).json({ message: "Write a message of up to 2,000 characters." });
  if (!isMember(req.user) && !isSecretary(req.user)) return res.status(403).json({ message: "Chat access is for NHG members and secretaries." });
  try {
    const conversation = await MarketplaceConversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Chat not found." });
    const userId = String(req.user._id);
    const memberSender = isMember(req.user) && String(conversation.member) === userId;
    const secretarySender = isSecretary(req.user) && String(conversation.secretary) === userId;
    if (!memberSender && !secretarySender) return res.status(403).json({ message: "You are not a participant in this chat." });
    conversation.messages.push({
      sender: req.user._id,
      senderName: req.user.name || (memberSender ? "NHG Member" : "NHG Secretary"),
      senderRole: memberSender ? "member" : "secretary",
      body,
      readBy: [{ userId, readAt: new Date() }],
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.status(201).json({ message: conversation.messages[conversation.messages.length - 1] });
  } catch (error) {
    res.status(500).json({ message: "Could not send this message." });
  }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct, openConversation, getConversations, getConversation, sendMessage };
