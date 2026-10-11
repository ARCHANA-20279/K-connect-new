const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getProducts, createProduct, updateProduct, deleteProduct,
  openConversation, getConversations, getConversation, sendMessage,
} = require("../controllers/marketplaceController");

const router = express.Router();
router.get("/products", protect, authorize("main_admin", "super_admin", "superadmin", "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer"), getProducts);
router.post("/products", protect, authorize("secretary"), createProduct);
router.put("/products/:productId", protect, authorize("secretary"), updateProduct);
router.delete("/products/:productId", protect, authorize("secretary"), deleteProduct);
router.post("/products/:productId/conversations", protect, authorize("member"), openConversation);
router.get("/conversations", protect, authorize("member", "secretary"), getConversations);
router.get("/conversations/:conversationId", protect, authorize("member", "secretary"), getConversation);
router.post("/conversations/:conversationId/messages", protect, authorize("member", "secretary"), sendMessage);

module.exports = router;
