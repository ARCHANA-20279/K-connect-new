const NHG = require("../models/NHG");
const User = require("../models/User");
const Member = require("../models/Member");
const Thrift = require("../models/Thrift");
const Loan = require("../models/Loan");
const Meeting = require("../models/Meeting");

// Helper: auto-generate next sequential NHG ID (e.g. NHG001, NHG002, etc.)
const generateNextNhgId = async () => {
  const allNhgs = await NHG.find({ nhgId: { $regex: /^NHG\d+$/i } }).select("nhgId");
  let maxNum = 0;
  for (const n of allNhgs) {
    if (n.nhgId) {
      const num = parseInt(n.nhgId.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const totalCount = await NHG.countDocuments({});
  const nextNum = Math.max(maxNum + 1, totalCount + 1);
  return `NHG${String(nextNum).padStart(3, "0")}`;
};

// 1. Public NHG Registration (Pending Verification)
const registerNHG = async (req, res) => {
  try {
    const {
      nhgName,
      name,
      district,
      localBodyType,
      localBodyName,
      wardNumber,
      ward,
      cdsName,
      adsName,
      presidentName,
      secretaryName,
      secretaryMobileNumber,
      secretaryPhone,
      secretaryEmail,
      numberOfMembers,
      memberCount,
      password,
    } = req.body;

    const finalName = (nhgName || name || "").trim();
    const finalEmail = (secretaryEmail || "").toLowerCase().trim();
    const finalPhone = (secretaryMobileNumber || secretaryPhone || "").trim();
    const finalWard = (wardNumber || ward || "15").trim();

    if (!finalName) {
      return res.status(400).json({ message: "NHG Name is required" });
    }
    if (!secretaryName || !secretaryName.trim() || !finalEmail) {
      return res.status(400).json({ message: "Secretary Name and Email are required" });
    }

    const existingName = await NHG.findOne({ name: { $regex: new RegExp(`^${finalName}$`, "i") } });
    if (existingName) {
      return res.status(400).json({ message: `An NHG with name '${finalName}' is already registered.` });
    }

    const existingUser = await User.findOne({ email: finalEmail });
    if (existingUser) {
      return res.status(400).json({ message: `An account with email '${finalEmail}' is already registered.` });
    }

    const nextNhgId = await generateNextNhgId();

    const nhg = await NHG.create({
      nhgId: nextNhgId,
      name: finalName,
      district: district || "Kannur",
      localBodyType: localBodyType || "Grama Panchayat",
      localBodyName: localBodyName || "",
      ward: finalWard,
      cdsName: cdsName || "",
      adsName: adsName || "",
      presidentName: presidentName ? presidentName.trim() : "",
      secretaryName: secretaryName.trim(),
      secretaryEmail: finalEmail,
      secretaryPhone: finalPhone,
      memberCount: Number(numberOfMembers || memberCount || 0),
      status: "Pending", // NHG must be verified by Main Admin before login
      panchayath: localBodyName || cdsName || "Kudumbashree CDS",
      description: `Registered Kudumbashree NHG under Ward ${finalWard}, ${cdsName || "CDS"}.`,
    });

    // Create the secretary user account linked to this NHG
    await User.create({
      name: secretaryName.trim(),
      email: finalEmail,
      password: password || "password123",
      role: "NHG_SECRETARY",
      nhgName: finalName,
      nhgId: nextNhgId,
      phone: finalPhone,
    });

    return res.status(201).json({
      success: true,
      message: "NHG registration submitted successfully. Your application is waiting for admin verification.",
      nhg,
    });
  } catch (error) {
    console.error("Register NHG error:", error);
    return res.status(500).json({ message: "Failed to register NHG", error: error.message });
  }
};

// 2. Get Pending NHG Registrations (Main Admin Only)
const getPendingNHGs = async (req, res) => {
  try {
    const pendingNHGs = await NHG.find({ status: "Pending" }).sort({ createdAt: -1 });
    return res.status(200).json({
      total: pendingNHGs.length,
      pendingNHGs,
    });
  } catch (error) {
    console.error("Get pending NHGs error:", error);
    return res.status(500).json({ message: "Failed to fetch pending NHGs", error: error.message });
  }
};

// 3. Approve an NHG (Main Admin Only)
const approveNHG = async (req, res) => {
  try {
    const { id } = req.params;
    let nhg = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      nhg = await NHG.findById(id);
    } else {
      nhg = await NHG.findOne({ nhgId: id });
    }

    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    // Ensure NHG has an ID
    if (!nhg.nhgId) {
      nhg.nhgId = await generateNextNhgId();
    }

    nhg.status = "Approved";
    nhg.rejectionReason = "";
    await nhg.save();

    // Ensure secretary user exists and is configured
    if (nhg.secretaryEmail) {
      await User.findOneAndUpdate(
        { email: nhg.secretaryEmail.toLowerCase() },
        { nhgName: nhg.name, nhgId: nhg.nhgId, role: "NHG_SECRETARY" }
      );
    }

    return res.status(200).json({
      success: true,
      message: `NHG '${nhg.name}' (${nhg.nhgId}) approved successfully! The NHG Secretary can now log in.`,
      nhg,
    });
  } catch (error) {
    console.error("Approve NHG error:", error);
    return res.status(500).json({ message: "Failed to approve NHG", error: error.message });
  }
};

// 4. Reject an NHG (Main Admin Only)
const rejectNHG = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectionReason } = req.body;
    let nhg = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      nhg = await NHG.findById(id);
    } else {
      nhg = await NHG.findOne({ nhgId: id });
    }

    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    const finalReason = (reason || rejectionReason || "Application did not meet verification criteria.").trim();
    nhg.status = "Rejected";
    nhg.rejectionReason = finalReason;
    await nhg.save();

    return res.status(200).json({
      success: true,
      message: `NHG '${nhg.name}' registration rejected. Reason: ${finalReason}`,
      nhg,
    });
  } catch (error) {
    console.error("Reject NHG error:", error);
    return res.status(500).json({ message: "Failed to reject NHG", error: error.message });
  }
};

// 5. Get all NHGs (Main Admin sees all, Secretary sees only own NHG)
const getNHGs = async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};

    const userRole = (req.user?.role || "").toLowerCase();
    const isMainAdmin = userRole === "main_admin" || userRole === "super_admin" || userRole === "superadmin";
    const isCdsOfficer = ["cds_officer", "ads_cds_officer"].includes(userRole);

    // CDS oversight is across its constituent NHGs; ADS and NHG users remain area-scoped.
    if (!isMainAdmin && !isCdsOfficer) {
      if (req.user?.nhgId) {
        filter.$or = [{ nhgId: req.user.nhgId }, { name: req.user.nhgName }];
      } else if (req.user?.nhgName) {
        filter.name = req.user.nhgName;
      }
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { nhgId: { $regex: q, $options: "i" } },
          { ward: { $regex: q, $options: "i" } },
          { cdsName: { $regex: q, $options: "i" } },
          { secretaryName: { $regex: q, $options: "i" } },
          { secretaryEmail: { $regex: q, $options: "i" } },
        ],
      });
    }

    const nhgs = await NHG.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ nhgs, total: nhgs.length });
  } catch (error) {
    console.error("Get NHGs error:", error);
    return res.status(500).json({ message: "Failed to fetch NHGs", error: error.message });
  }
};

// 6. Get Single NHG Details with Statistics
const getNHGById = async (req, res) => {
  try {
    const { id } = req.params;
    let nhg = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      nhg = await NHG.findById(id);
    } else {
      nhg = await NHG.findOne({ $or: [{ nhgId: id }, { name: id }] });
    }

    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    const nhgFilter = {
      $or: [
        ...(nhg.nhgId ? [{ nhgId: nhg.nhgId }] : []),
        { nhgName: nhg.name },
      ],
    };

    const [membersCount, meetingsCount, loansCount, thriftRecords] = await Promise.all([
      Member.countDocuments(nhgFilter),
      Meeting.countDocuments(nhgFilter),
      Loan.countDocuments(nhgFilter),
      Thrift.find(nhgFilter),
    ]);

    const totalSavings = thriftRecords.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return res.status(200).json({
      nhg,
      stats: {
        membersCount,
        meetingsCount,
        loansCount,
        totalSavings,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to get NHG details", error: error.message });
  }
};

// 7. Public List of Active/Approved NHGs (for public display & registration dropdowns)
const getPublicNHGList = async (req, res) => {
  try {
    const activeNHGs = await NHG.find({ status: { $in: ["Active", "Approved"] } })
      .select("nhgId name ward panchayath secretaryName district localBodyName cdsName")
      .sort({ name: 1 });

    const list = activeNHGs.length > 0 ? activeNHGs : [
      { nhgId: "NHG001", name: "Ward 15 Ayalkoottam", ward: "15", panchayath: "Kudumbashree CDS" },
      { nhgId: "NHG002", name: "deepam", ward: "12", panchayath: "Kudumbashree CDS" },
      { nhgId: "NHG003", name: "Jaaango", ward: "08", panchayath: "Kudumbashree CDS" },
    ];

    return res.status(200).json({ nhgs: list });
  } catch (error) {
    console.error("Get public NHG list error:", error);
    return res.status(500).json({ message: "Failed to fetch active NHG list", error: error.message });
  }
};

// 8. Create a New NHG directly (Main Admin Only)
const createNHG = async (req, res) => {
  try {
    const { name, nhgName, ward, district, localBodyType, localBodyName, cdsName, adsName, presidentName, secretaryName, secretaryEmail, secretaryPhone, description, status } = req.body;
    const finalName = (nhgName || name || "").trim();

    if (!finalName) {
      return res.status(400).json({ message: "NHG Name is required" });
    }

    const existing = await NHG.findOne({ name: { $regex: new RegExp(`^${finalName}$`, "i") } });
    if (existing) {
      return res.status(400).json({ message: `NHG '${finalName}' already exists` });
    }

    const nextNhgId = await generateNextNhgId();

    const nhg = await NHG.create({
      nhgId: nextNhgId,
      name: finalName,
      ward: ward ? ward.trim() : "15",
      district: district || "Kannur",
      localBodyType: localBodyType || "Grama Panchayat",
      localBodyName: localBodyName || "",
      cdsName: cdsName || "",
      adsName: adsName || "",
      presidentName: presidentName ? presidentName.trim() : "",
      secretaryName: secretaryName ? secretaryName.trim() : "",
      secretaryEmail: secretaryEmail ? secretaryEmail.toLowerCase().trim() : "",
      secretaryPhone: secretaryPhone ? secretaryPhone.trim() : "",
      description: description ? description.trim() : "",
      status: status || "Approved",
      panchayath: localBodyName || cdsName || "Kudumbashree CDS",
    });

    if (secretaryEmail) {
      await User.findOneAndUpdate(
        { email: secretaryEmail.toLowerCase().trim() },
        { nhgName: finalName, nhgId: nextNhgId, role: "NHG_SECRETARY" }
      );
    }

    return res.status(201).json({ message: `NHG '${finalName}' (${nextNhgId}) created successfully!`, nhg });
  } catch (error) {
    console.error("Create NHG error:", error);
    return res.status(500).json({ message: "Failed to create NHG", error: error.message });
  }
};

// 9. Update NHG Details (Main Admin Only)
const updateNHG = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ward, district, localBodyType, localBodyName, cdsName, adsName, presidentName, secretaryName, secretaryEmail, secretaryPhone, status, description, rejectionReason } = req.body;

    const nhg = await NHG.findById(id);
    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    const oldName = nhg.name;
    if (name && name.trim()) nhg.name = name.trim();
    if (ward) nhg.ward = ward.trim();
    if (district) nhg.district = district.trim();
    if (localBodyType) nhg.localBodyType = localBodyType;
    if (localBodyName !== undefined) nhg.localBodyName = localBodyName.trim();
    if (cdsName !== undefined) nhg.cdsName = cdsName.trim();
    if (adsName !== undefined) nhg.adsName = adsName.trim();
    if (presidentName !== undefined) nhg.presidentName = presidentName.trim();
    if (secretaryName !== undefined) nhg.secretaryName = secretaryName.trim();
    if (secretaryEmail !== undefined) nhg.secretaryEmail = secretaryEmail.toLowerCase().trim();
    if (secretaryPhone !== undefined) nhg.secretaryPhone = secretaryPhone.trim();
    if (status) nhg.status = status;
    if (rejectionReason !== undefined) nhg.rejectionReason = rejectionReason.trim();
    if (description !== undefined) nhg.description = description.trim();

    await nhg.save();

    if (name && name.trim() !== oldName) {
      await User.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
      await Member.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
      await Meeting.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
      await Loan.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
      await Thrift.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
      await Attendance.updateMany({ nhgName: oldName }, { nhgName: nhg.name });
    }

    if (nhg.secretaryEmail) {
      await User.findOneAndUpdate(
        { email: nhg.secretaryEmail },
        { nhgName: nhg.name, nhgId: nhg.nhgId, role: "NHG_SECRETARY" }
      );
    }

    return res.status(200).json({ message: `NHG '${nhg.name}' updated successfully!`, nhg });
  } catch (error) {
    console.error("Update NHG error:", error);
    return res.status(500).json({ message: "Failed to update NHG", error: error.message });
  }
};

// 10. Toggle NHG Status: Active <-> Inactive (Main Admin Only)
const toggleNHGStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nhg = await NHG.findById(id);
    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    nhg.status = nhg.status === "Active" || nhg.status === "Approved" ? "Inactive" : "Approved";
    await nhg.save();

    return res.status(200).json({
      message: `NHG '${nhg.name}' status is now ${nhg.status}!`,
      nhg,
    });
  } catch (error) {
    console.error("Toggle NHG status error:", error);
    return res.status(500).json({ message: "Failed to update NHG status", error: error.message });
  }
};

// 11. Delete NHG (Main Admin Only)
const deleteNHG = async (req, res) => {
  try {
    const { id } = req.params;
    const nhg = await NHG.findByIdAndDelete(id);
    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    return res.status(200).json({ message: `NHG '${nhg.name}' deleted successfully.` });
  } catch (error) {
    console.error("Delete NHG error:", error);
    return res.status(500).json({ message: "Failed to delete NHG", error: error.message });
  }
};

// 12. Main Admin Platform Overview Stats
const getPlatformStats = async (req, res) => {
  try {
    const [totalNHGs, pendingNHGs, approvedNHGs, totalSecretaries, totalMembers, allThrift, allLoans, totalMeetings] =
      await Promise.all([
        NHG.countDocuments({}),
        NHG.countDocuments({ status: "Pending" }),
        NHG.countDocuments({ status: { $in: ["Approved", "Active"] } }),
        User.countDocuments({ role: { $in: ["NHG_SECRETARY", "secretary"] } }),
        Member.countDocuments({ status: "Active" }),
        Thrift.find({}),
        Loan.find({ status: "Approved" }),
        Meeting.countDocuments({}),
      ]);

    const totalThriftFund = allThrift.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalLoansDisbursed = allLoans.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    return res.status(200).json({
      totalNHGs,
      pendingNHGs,
      approvedNHGs,
      totalSecretaries,
      totalMembers,
      totalThriftFund,
      totalLoansDisbursed,
      totalMeetings,
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    return res.status(500).json({ message: "Failed to fetch platform stats", error: error.message });
  }
};

// 13. Get All NHG Secretaries (Main Admin Only)
const getSecretaries = async (req, res) => {
  try {
    const secretaries = await User.find({ role: { $in: ["NHG_SECRETARY", "secretary"] } })
      .select("name email phone nhgName nhgId createdAt")
      .sort({ name: 1 });

    return res.status(200).json({ secretaries });
  } catch (error) {
    console.error("Get secretaries error:", error);
    return res.status(500).json({ message: "Failed to fetch secretaries", error: error.message });
  }
};

// 14. Assign Secretary to NHG (Main Admin Only)
const assignSecretary = async (req, res) => {
  try {
    const { nhgId, secretaryEmail } = req.body;
    if (!nhgId || !secretaryEmail) {
      return res.status(400).json({ message: "NHG ID and Secretary Email are required" });
    }

    const nhg = await NHG.findById(nhgId);
    if (!nhg) {
      return res.status(404).json({ message: "NHG not found" });
    }

    const user = await User.findOne({ email: secretaryEmail.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User with this email not found" });
    }

    user.role = "NHG_SECRETARY";
    user.nhgName = nhg.name;
    user.nhgId = nhg.nhgId;
    await user.save();

    nhg.secretaryEmail = user.email;
    nhg.secretaryName = user.name;
    if (user.phone) nhg.secretaryPhone = user.phone;
    await nhg.save();

    return res.status(200).json({
      message: `${user.name} assigned as Secretary for '${nhg.name}'!`,
      nhg,
      secretary: user,
    });
  } catch (error) {
    console.error("Assign secretary error:", error);
    return res.status(500).json({ message: "Failed to assign secretary", error: error.message });
  }
};

module.exports = {
  registerNHG,
  getPendingNHGs,
  approveNHG,
  rejectNHG,
  getNHGs,
  getNHGById,
  getPublicNHGList,
  createNHG,
  updateNHG,
  toggleNHGStatus,
  deleteNHG,
  getPlatformStats,
  getSecretaries,
  assignSecretary,
};
