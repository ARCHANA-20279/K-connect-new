const Thrift = require("../models/Thrift");
const Member = require("../models/Member");
const NHG = require("../models/NHG");
const { calculateCreditScore } = require("../services/creditScoreService");

// 1. Record Thrift Deposit (Secretary Only)
const recordThrift = async (req, res) => {
  try {
    const { memberId, amount, date, paymentMode, remarks } = req.body;

    if (!memberId || !amount) {
      return res.status(400).json({ message: "Member ID and deposit amount are required." });
    }

    const member = await Member.findOne({ memberId: memberId.trim() });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    const isMainAdmin = ["main_admin", "super_admin", "superadmin"].includes((req.user?.role || "").toLowerCase());
    if (!isMainAdmin) {
      const belongsToNhg = (req.user?.nhgId && member.nhgId === req.user.nhgId) ||
        (req.user?.nhgName && member.nhgName === req.user.nhgName);
      if (!belongsToNhg) return res.status(403).json({ message: "You can only record thrift for members of your NHG." });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Deposit amount must be greater than 0." });
    }

    const todayStr = date || new Date().toISOString().split("T")[0];
    const totalCount = await Thrift.countDocuments({});
    const receiptNumber = `TH-${String(totalCount + 101).padStart(5, "0")}`;

    const nhgName = req.user?.nhgName || member.nhgName || "Ward 15 Ayalkoottam";
    let nhgId = req.user?.nhgId || member.nhgId || "";

    if (!nhgId && nhgName) {
      const foundNhg = await NHG.findOne({ name: nhgName });
      if (foundNhg && foundNhg.nhgId) nhgId = foundNhg.nhgId;
    }

    const thrift = await Thrift.create({
      memberId: member.memberId,
      memberName: member.name,
      amount: Number(amount),
      date: todayStr,
      receiptNumber,
      paymentMode: paymentMode || "Cash",
      remarks: remarks || "Weekly Thrift Savings",
      collectedBy: req.user ? req.user.name : "NHG Secretary",
      nhgName,
      nhgId,
    });
    await calculateCreditScore(member.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));

    return res.status(201).json({
      message: `Thrift deposit of ₹${amount} recorded for ${member.name} (Receipt: ${receiptNumber})`,
      thrift,
    });
  } catch (error) {
    console.error("Record thrift error:", error);
    return res.status(500).json({ message: "Failed to record thrift", error: error.message });
  }
};

// 2. Get All Thrift Deposits & NHG Total Savings Fund (with Multi-NHG isolation)
const getAllThrift = async (req, res) => {
  try {
    let filter = {};
    const user = req.user;

    if (user) {
      const rawRole = (user.role || "").toLowerCase();
      const isMainAdmin = rawRole === "main_admin" || rawRole === "super_admin" || rawRole === "superadmin";

      if (!isMainAdmin) {
        const isSecretary = rawRole === "secretary" || rawRole === "nhg_secretary";
        const isMember = rawRole === "member";

        if (isSecretary) {
          const conditions = [];
          if (user.nhgId) conditions.push({ nhgId: user.nhgId });
          if (user.nhgName) conditions.push({ nhgName: user.nhgName });
          if (conditions.length === 0) return res.status(403).json({ message: "Your account is not linked to an NHG." });
          filter.$or = conditions;
        } else if (isMember) {
          filter.memberId = user.memberId || "__unlinked_member__";
        } else {
          return res.status(403).json({ message: "You do not have access to thrift records." });
        }
      } else {
        // Main Admin can view all thrift across NHGs or filter by query
        if (req.query.nhgId) {
          filter.$or = [{ nhgId: req.query.nhgId }, { nhgName: req.query.nhgName }];
        } else if (req.query.nhgName) {
          filter.nhgName = req.query.nhgName;
        }
      }
    }

    const deposits = await Thrift.find(filter).sort({ createdAt: -1 });

    const totalSavingsFund = deposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Group totals by member
    const memberSummary = {};
    deposits.forEach((d) => {
      if (!memberSummary[d.memberId]) {
        memberSummary[d.memberId] = {
          memberId: d.memberId,
          memberName: d.memberName,
          totalSaved: 0,
          depositCount: 0,
        };
      }
      memberSummary[d.memberId].totalSaved += (Number(d.amount) || 0);
      memberSummary[d.memberId].depositCount += 1;
    });

    return res.status(200).json({
      totalSavingsFund,
      totalDepositsCount: deposits.length,
      deposits,
      memberSummaries: Object.values(memberSummary),
    });
  } catch (error) {
    console.error("Get thrift error:", error);
    return res.status(500).json({ message: "Failed to fetch thrift data", error: error.message });
  }
};

// 3. Get Digital Passbook for a single Member
const getMemberPassbook = async (req, res) => {
  try {
    const { memberId } = req.params;
    const cleanId = (memberId || "").trim();
    const role = (req.user?.role || "").toLowerCase();
    const isAdmin = ["main_admin", "super_admin", "superadmin"].includes(role);
    const isSecretary = ["secretary", "nhg_secretary"].includes(role);
    if (role === "member" && cleanId.toLowerCase() !== (req.user.memberId || "").toLowerCase()) {
      return res.status(403).json({ message: "You can only view your own passbook." });
    }
    if (isSecretary) {
      const belongsToNhg = {
        memberId: { $regex: new RegExp(`^${cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        $or: [
          ...(req.user.nhgId ? [{ nhgId: req.user.nhgId }] : []),
          ...(req.user.nhgName ? [{ nhgName: req.user.nhgName }] : []),
        ],
      };
      const memberInNhg = await Thrift.exists(belongsToNhg);
      const Member = require("../models/Member");
      const member = await Member.findOne({ memberId: new RegExp(`^${cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
      const memberMatchesNhg = member && ((req.user.nhgId && member.nhgId === req.user.nhgId) || (req.user.nhgName && member.nhgName === req.user.nhgName));
      if (!memberInNhg && !memberMatchesNhg) return res.status(403).json({ message: "This member belongs to another NHG." });
    }
    if (!isAdmin && role !== "member" && !isSecretary) {
      return res.status(403).json({ message: "You do not have access to member passbooks." });
    }
    const deposits = await Thrift.find({
      memberId: { $regex: new RegExp(`^${cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    }).sort({ date: -1 });

    const totalSaved = deposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return res.status(200).json({
      memberId: cleanId,
      totalSaved,
      depositCount: deposits.length,
      deposits,
    });
  } catch (error) {
    console.error("Get passbook error:", error);
    return res.status(500).json({ message: "Failed to fetch passbook", error: error.message });
  }
};

// Correct a previously recorded thrift entry (Secretary for their own NHG only).
const updateThrift = async (req, res) => {
  try {
    const thrift = await Thrift.findById(req.params.id);
    if (!thrift) return res.status(404).json({ message: "Thrift record not found" });

    const user = req.user;
    const belongsToNhg = (user.nhgId && thrift.nhgId === user.nhgId) ||
      (user.nhgName && thrift.nhgName === user.nhgName);
    if (!belongsToNhg) return res.status(403).json({ message: "You can only update thrift records for your NHG." });

    const { amount, date, paymentMode, remarks } = req.body;
    if (amount !== undefined) {
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "Deposit amount must be greater than 0." });
      }
      thrift.amount = Number(amount);
    }
    if (date !== undefined) thrift.date = date;
    if (paymentMode !== undefined) {
      if (!["Cash", "UPI", "Bank"].includes(paymentMode)) {
        return res.status(400).json({ message: "Choose Cash, UPI, or Bank as the payment mode." });
      }
      thrift.paymentMode = paymentMode;
    }
    if (remarks !== undefined) thrift.remarks = remarks;

    await thrift.save();
    await calculateCreditScore(thrift.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));
    return res.status(200).json({ message: "Thrift record updated", thrift });
  } catch (error) {
    console.error("Update thrift error:", error);
    return res.status(500).json({ message: "Failed to update thrift record", error: error.message });
  }
};

// 4. Delete thrift entry
const deleteThrift = async (req, res) => {
  try {
    const { id } = req.params;
    const thrift = await Thrift.findById(id);
    if (!thrift) return res.status(404).json({ message: "Thrift record not found" });
    const user = req.user;
    const belongsToNhg = (user.nhgId && thrift.nhgId === user.nhgId) || (user.nhgName && thrift.nhgName === user.nhgName);
    if (!belongsToNhg) return res.status(403).json({ message: "You can only manage thrift records for your NHG." });
    await thrift.deleteOne();
    await calculateCreditScore(thrift.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));
    return res.status(200).json({ message: "Thrift record deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete", error: error.message });
  }
};

module.exports = {
  recordThrift,
  getAllThrift,
  getMemberPassbook,
  updateThrift,
  deleteThrift,
};
