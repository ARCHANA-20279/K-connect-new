const express = require("express");
const {
  recordThrift,
  getAllThrift,
  getMemberPassbook,
  deleteThrift,
} = require("../controllers/thriftController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Only Secretary can record or delete thrift collections
router.post("/", protect, authorize("secretary"), recordThrift);
router.delete("/:id", protect, authorize("secretary"), deleteThrift);

// Public / Members can view thrift aggregates and passbooks (isolated by NHG if logged in)
router.get("/", protect, getAllThrift);
router.get("/passbook/:memberId", protect, getMemberPassbook);

module.exports = router;
