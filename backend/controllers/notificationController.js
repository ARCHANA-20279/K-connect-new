const Notification = require("../models/Notification");
const Member = require("../models/Member");

// 1. Get all notifications (with optional type filter and NHG isolation)
const getNotifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type === "CIRCULAR") {
      filter.type = { $in: ["CIRCULAR", "AUDIT"] };
    } else if (req.query.type) {
      filter.type = req.query.type;
    }

    const user = req.user;
    if (!user) {
      const publicTypes = ["CIRCULAR", "AUDIT", "ANNOUNCEMENT"];
      if (req.query.type && req.query.type !== "CIRCULAR") {
        filter.type = "__public_notice_only__";
      } else if (req.query.type === "CIRCULAR") {
        filter.type = { $in: ["CIRCULAR", "AUDIT"] };
      } else {
        filter.type = { $in: publicTypes };
      }
    }
    if (user) {
      const rawRole = (user.role || "").toLowerCase();
      const isMainAdmin = rawRole === "main_admin" || rawRole === "super_admin" || rawRole === "superadmin";

      if (!isMainAdmin) {
        const role = rawRole.replace(/[-_]/g, "");
        const recipientRoles = role === "member" ? ["member"]
          : ["secretary", "nhgsecretary"].includes(role) ? ["secretary", "nhg_secretary"]
          : role === "adsofficer" ? ["ads_officer"]
          : role === "cdsofficer" ? ["cds_officer"]
          : role === "adscdsofficer" ? ["ads_officer", "cds_officer", "ads_cds_officer"]
          : role === "bankofficer" ? ["bank_officer"]
          : [];
        const scope = [{ $and: [{ nhgId: { $in: [null, "", undefined] } }, { nhgName: { $in: [null, "", undefined] } }] }];
        if (role === "cdsofficer") {
          scope.push({ $or: [{ nhgId: { $exists: true } }, { nhgName: { $exists: true } }] });
        } else {
          if (user.nhgId) scope.push({ nhgId: user.nhgId });
          if (user.nhgName) scope.push({ nhgName: user.nhgName });
        }
        const audienceFilter = { $or: [{ recipientRole: "all" }, { recipientRole: { $in: recipientRoles } }] };
        filter.$and = [
          ...(filter.$and || []),
          audienceFilter,
          ...(role === "bankofficer" ? [] : [{ $or: scope }]),
          ...(role === "member" ? [{ $or: [{ type: { $ne: "JOB" } }, { recipientMemberId: user.memberId || "" }] }] : []),
        ];
      }
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false, ...filter });

    return res.status(200).json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
  };

// 2. Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

// 3. Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      message: "Failed to mark all as read",
      error: error.message,
    });
  }
};

// 4. Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// 5. Create CDS / ADS Official Circular (CDS/ADS Officer Only)
const createCircular = async (req, res) => {
  try {
    const { title, message, issuingAuthority, category, circularNo, targetAudience } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Notice title and message are required." });
    }

    const count = await Notification.countDocuments({ type: { $in: ["CIRCULAR", "AUDIT"] } });
    const isAudit = category && category.toLowerCase().includes("audit");
    const role = (req.user?.role || "").toLowerCase().replace(/-/g, "_");
    const issuingOffice = role === "ads_officer" ? "Ward ADS Committee" : (issuingAuthority || "Panchayath CDS Office");
    const prefix = isAudit ? "CDS-AUD" : "CDS-CIR";
    const generatedNo = circularNo && circularNo.trim() !== ""
      ? circularNo.trim()
      : `${prefix}-2026/${String(count + 101).padStart(3, "0")}`;

    const circular = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type: isAudit ? "AUDIT" : "CIRCULAR",
      recipientRole: "all",
      targetAudience: targetAudience || "All NHG Members & Secretaries",
      issuingAuthority: issuingOffice,
      category: category || "Auditing Notice",
      circularNo: generatedNo,
      createdBy: req.user ? req.user.name : "CDS / ADS Officer",
    });

    return res.status(201).json({
      message: "Official circular broadcasted successfully",
      circular,
    });
  } catch (error) {
    console.error("Create circular error:", error);
    return res.status(500).json({ message: "Failed to broadcast circular", error: error.message });
  }
};

// 6. Get active member recipients (to show who received the alert)
const getMemberRecipients = async (req, res) => {
  try {
    const members = await Member.find({ status: "Active" }).select("name phone ward memberId");
    return res.status(200).json({
      totalMembers: members.length,
      members,
    });
  } catch (error) {
    console.error("Get recipients error:", error);
    return res.status(500).json({
      message: "Failed to fetch member recipients",
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  createCircular,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getMemberRecipients,
};
