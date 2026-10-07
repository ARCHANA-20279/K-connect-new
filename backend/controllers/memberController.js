const Member = require("../models/Member");
const NHG = require("../models/NHG");
const User = require("../models/User");

const secretaryOwnsMember = (secretary, member) =>
  Boolean((secretary.nhgId && member.nhgId === secretary.nhgId) || (secretary.nhgName && member.nhgName === secretary.nhgName));

// 1. Register a new member (Secretary only for their own NHG, or Main Admin)
const createMember = async (req, res) => {
  try {
    const { name, phone, email, address, ward } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        message: "Name, phone, and address are required",
      });
    }

    // Generate unique Member ID
    const lastMember = await Member.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastMember && lastMember.memberId) {
      const lastNumber = parseInt(lastMember.memberId.replace("KC", ""), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    const memberId = `KC${String(nextNumber).padStart(5, "0")}`;

    // Obtain NHG identity strictly from authenticated user (do not trust frontend)
    let nhgName = req.user?.nhgName || req.body.nhgName || address;
    let nhgId = req.user?.nhgId || req.body.nhgId || "";

    if (!nhgId && nhgName) {
      const foundNhg = await NHG.findOne({ name: nhgName });
      if (foundNhg && foundNhg.nhgId) {
        nhgId = foundNhg.nhgId;
      }
    }

    const member = await Member.create({
      memberId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : "",
      address: address.trim(),
      ward: ward ? ward.trim() : "15",
      nhgName,
      nhgId,
      status: "Active",
    });

    res.status(201).json({
      message: "Member registered successfully",
      member,
    });
  } catch (error) {
    console.error("Create member error:", error);
    res.status(500).json({
      message: "Failed to register member",
      error: error.message,
    });
  }
};

// 2. Get all members (Multi-NHG strictly isolated)
const getMembers = async (req, res) => {
  try {
    let filter = {};
    const user = req.user;

    if (user) {
      const role = (user.role || "").toLowerCase();
      const isMainAdmin = role === "main_admin" || role === "super_admin" || role === "superadmin";

      if (!isMainAdmin) {
        // Secretary & Member: Strictly bounded to their own NHG
        const conditions = [];
        if (user.nhgId) {
          conditions.push({ nhgId: user.nhgId });
        }
        if (user.nhgName) {
          conditions.push({ nhgName: user.nhgName }, { address: user.nhgName });
        }
        if (conditions.length > 0) {
          filter.$or = conditions;
        }
      } else {
        // Main Admin can view all members or filter optionally
        if (req.query.nhgId) {
          filter.$or = [{ nhgId: req.query.nhgId }, { nhgName: req.query.nhgName }];
        } else if (req.query.nhgName) {
          filter.$or = [{ nhgName: req.query.nhgName }, { address: req.query.nhgName }];
        }
      }
    }

    const members = await Member.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      total: members.length,
      members,
    });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({
      message: "Failed to fetch members",
    });
  }
};

// 3. Update a member
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, ward } = req.body;

    const existing = await Member.findById(id);
    if (!existing) return res.status(404).json({ message: "Member not found" });
    if (!secretaryOwnsMember(req.user, existing)) return res.status(403).json({ message: "You can only manage members of your NHG." });

    const updateFields = {
      ...(name && { name: name.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
      ...(address && { address: address.trim() }),
      ...(ward && { ward: ward.trim() }),
    };

    const member = await Member.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.status(200).json({
      message: "Member updated successfully",
      member,
    });
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({
      message: "Failed to update member",
      error: error.message,
    });
  }
};

// 4. Deactivate a member
const deactivateMember = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Member.findById(id);
    if (!existing) return res.status(404).json({ message: "Member not found" });
    if (!secretaryOwnsMember(req.user, existing)) return res.status(403).json({ message: "You can only manage members of your NHG." });

    const member = await Member.findByIdAndUpdate(
      id,
      { status: "Inactive" },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.status(200).json({
      message: "Member deactivated successfully",
      member,
    });
  } catch (error) {
    console.error("Deactivate member error:", error);
    res.status(500).json({
      message: "Failed to deactivate member",
      error: error.message,
    });
  }
};

const approveMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!secretaryOwnsMember(req.user, member)) return res.status(403).json({ message: "You can only review members of your NHG." });
    if (member.status !== "Pending") return res.status(400).json({ message: "Only pending membership requests can be approved." });

    member.status = "Active";
    member.rejectionReason = "";
    await member.save();

    const accountFilter = [{ memberId: member.memberId }];
    if (member.email) accountFilter.push({ email: member.email });
    const account = await User.findOne({ $or: accountFilter });
    if (account) {
      account.memberId = member.memberId;
      account.nhgId = member.nhgId || account.nhgId;
      account.nhgName = member.nhgName || account.nhgName;
      account.qrCode = member.memberId;
      await account.save();
    }

    return res.status(200).json({ message: "Membership approved. The member can now sign in.", member });
  } catch (error) {
    console.error("Approve member error:", error);
    return res.status(500).json({ message: "Failed to approve membership", error: error.message });
  }
};

const rejectMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (!secretaryOwnsMember(req.user, member)) return res.status(403).json({ message: "You can only review members of your NHG." });
    if (member.status !== "Pending") return res.status(400).json({ message: "Only pending membership requests can be declined." });

    member.status = "Rejected";
    member.rejectionReason = (req.body.reason || "Please contact your NHG Secretary for more information.").trim();
    await member.save();

    return res.status(200).json({ message: "Membership request declined.", member });
  } catch (error) {
    console.error("Reject member error:", error);
    return res.status(500).json({ message: "Failed to decline membership request", error: error.message });
  }
};

module.exports = {
  createMember,
  getMembers,
  updateMember,
  deactivateMember,
  approveMember,
  rejectMember,
};
