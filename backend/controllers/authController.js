const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createDemoBankOfficer = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || password.length < 6) {
      return res.status(400).json({ message: "Enter a name, valid email, and password with at least 6 characters." });
    }
    if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password, role: "bank_officer" });
    return res.status(201).json({ message: "Demo Bank Officer account created. Sign in with the email and password you set.", user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Create demo Bank Officer error:", error);
    return res.status(500).json({ message: "Could not create the demo Bank Officer account." });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, nhgName, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const signupRole = String(role).toLowerCase();
    if (!["member", "secretary", "nhg_secretary", "ads_officer", "cds_officer", "ads_cds_officer"].includes(signupRole)) {
      return res.status(400).json({ message: "Choose an available community account type." });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const Member = require("../models/Member");
    const NHG = require("../models/NHG");
    const memberRole = (role || "").toLowerCase() === "member";
    let memberId = "";
    let userNhg = null;

    if (memberRole) {
      const nhgFilter = req.body.nhgId
        ? { nhgId: req.body.nhgId }
        : { name: (nhgName || "").trim() };
      userNhg = await NHG.findOne({ ...nhgFilter, status: { $in: ["Active", "Approved"] } });
      if (!userNhg) {
        return res.status(400).json({ message: "Choose an active NHG so its Secretary can review your membership request." });
      }

      let member = await Member.findOne({ email: email.toLowerCase().trim() });
      if (member) {
        const sameNhg = (member.nhgId && member.nhgId === userNhg.nhgId) || member.nhgName === userNhg.name;
        if (!sameNhg) return res.status(409).json({ message: "This email is already linked to a member profile in another NHG." });
        member.status = "Pending";
        member.rejectionReason = "";
        await member.save();
      } else {
        const lastMember = await Member.findOne().sort({ createdAt: -1 });
        const lastNumber = lastMember?.memberId ? parseInt(lastMember.memberId.replace("KC", ""), 10) : 0;
        memberId = `KC${String(Number.isNaN(lastNumber) ? 1 : lastNumber + 1).padStart(5, "0")}`;
        member = await Member.create({
          memberId,
          name: name.trim(),
          phone: phone || "Not Provided",
          email: email.toLowerCase().trim(),
          address: userNhg.name,
          nhgName: userNhg.name,
          nhgId: userNhg.nhgId || "",
          ward: userNhg.ward || "15",
          status: "Pending",
        });
      }
      memberId = member.memberId;
    } else {
      userNhg = await NHG.findOne({ $or: [{ nhgId: req.body.nhgId || "__none__" }, { name: nhgName || "__none__" }] });
      if (["ads_officer", "cds_officer", "ads_cds_officer"].includes(signupRole) && !userNhg) {
        return res.status(400).json({ message: "ADS/CDS review accounts must be linked to an NHG review area." });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: memberRole ? "MEMBER" : role,
      nhgName: memberRole ? userNhg.name : nhgName,
      nhgId: userNhg?.nhgId || "",
      phone,
      qrCode: undefined,
      memberId: memberId || "",
    });

    if (memberRole) {
      return res.status(201).json({
        pendingApproval: true,
        memberId,
        message: "Your membership request has been sent to your NHG Secretary. You can sign in after it is approved.",
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      nhgName: user.nhgName,
      nhgId: user.nhgId || "",
      qrCode: user.qrCode,
      memberId: user.memberId || "",
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const NHG = require("../models/NHG");
    let userNhg = null;

    if (user.nhgId) {
      userNhg = await NHG.findOne({ nhgId: user.nhgId });
    }
    if (!userNhg && user.nhgName) {
      userNhg = await NHG.findOne({ name: user.nhgName });
    }
    if (!userNhg && user.email) {
      userNhg = await NHG.findOne({ secretaryEmail: user.email.toLowerCase() });
    }

    // Role normalization
    const rawRole = (user.role || "").toLowerCase();
    const isSecretary = rawRole === "secretary" || rawRole === "nhg_secretary";
    const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin" || rawRole === "main_admin";

    // If Secretary, verify NHG approval status
    if (isSecretary && userNhg) {
      if (userNhg.status === "Pending") {
        return res.status(403).json({
          message: "NHG registration submitted successfully. Your application is waiting for admin verification.",
          status: "Pending",
          nhgName: userNhg.name,
        });
      }
      if (userNhg.status === "Rejected") {
        return res.status(403).json({
          message: `Your NHG registration has been rejected by the administrator.${userNhg.rejectionReason ? ` Reason: ${userNhg.rejectionReason}` : ""}`,
          status: "Rejected",
          rejectionReason: userNhg.rejectionReason,
          nhgName: userNhg.name,
        });
      }
      if (userNhg.status === "Inactive") {
        return res.status(403).json({
          message: `NHG '${userNhg.name}' is currently inactive. Please contact the platform admin.`,
          status: "Inactive",
        });
      }

      // Sync nhgId & nhgName
      if (userNhg.nhgId && user.nhgId !== userNhg.nhgId) {
        user.nhgId = userNhg.nhgId;
        user.nhgName = userNhg.name;
        await user.save();
      }
    }

    let memberId = user.memberId;
    if (rawRole === "member") {
      try {
        const Member = require("../models/Member");
        let linkedMember = memberId ? await Member.findOne({ memberId }) : null;
        if (linkedMember?.email && linkedMember.email.toLowerCase() !== user.email.toLowerCase()) linkedMember = null;
        if (!linkedMember) linkedMember = await Member.findOne({ email: user.email.toLowerCase() });

        // Legacy member accounts without a registry record enter the same secretary review queue.
        if (!linkedMember) {
          if (!userNhg || !["Active", "Approved"].includes(userNhg.status)) {
            return res.status(403).json({ message: "Your account is not linked to an active NHG. Please contact your NHG Secretary.", status: "Pending" });
          }
          const lastMember = await Member.findOne().sort({ createdAt: -1 });
          const lastNumber = lastMember?.memberId ? parseInt(lastMember.memberId.replace("KC", ""), 10) : 0;
          memberId = `KC${String(Number.isNaN(lastNumber) ? 1 : lastNumber + 1).padStart(5, "0")}`;
          linkedMember = await Member.create({
            memberId,
            name: user.name,
            phone: user.phone || "Not Provided",
            email: user.email,
            address: userNhg.name,
            nhgName: userNhg.name,
            nhgId: userNhg.nhgId || "",
            ward: userNhg.ward || "15",
            status: "Pending",
          });
          user.memberId = memberId;
          await user.save();
        }

        if (linkedMember.status === "Pending") {
          return res.status(403).json({
            message: "Your membership request is waiting for approval from your NHG Secretary.",
            status: "Pending",
            nhgName: linkedMember.nhgName,
          });
        }
        if (linkedMember.status === "Rejected") {
          return res.status(403).json({
            message: `Your membership request was not approved.${linkedMember.rejectionReason ? ` Reason: ${linkedMember.rejectionReason}` : " Please contact your NHG Secretary."}`,
            status: "Rejected",
            nhgName: linkedMember.nhgName,
          });
        }
        if (linkedMember.status !== "Active") {
          return res.status(403).json({ message: "Your membership is inactive. Please contact your NHG Secretary.", status: "Inactive" });
        }

        memberId = linkedMember.memberId;

        user.memberId = memberId;
        user.qrCode = memberId;
        await user.save();
      } catch (findErr) {
        console.error("Auto-resolve member ID error:", findErr);
      }
    }

    const normalizedRole = isSuperAdmin
      ? "MAIN_ADMIN"
      : isSecretary
      ? "NHG_SECRETARY"
      : rawRole === "ads_cds_officer"
      ? "ads_cds_officer"
      : rawRole === "ads_officer"
      ? "ads_officer"
      : rawRole === "cds_officer"
      ? "cds_officer"
      : rawRole === "bank_officer"
      ? "bank_officer"
      : "MEMBER";

    const resolvedNhgId = user.nhgId || userNhg?.nhgId || "";
    const resolvedNhgName = user.nhgName || userNhg?.name || "";

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      rawRole: user.role,
      nhgName: resolvedNhgName,
      nhgId: resolvedNhgId,
      qrCode: user.qrCode || memberId || "",
      memberId: memberId || "",
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide your registered email address" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Return safe message without exposing account existence
      return res.status(200).json({
        message: "If an account exists with this email, password reset instructions have been dispatched. You can also contact your NHG Secretary for identity verification.",
      });
    }

    return res.status(200).json({
      message: `Password reset request submitted for ${cleanEmail}. Please check your inbox or contact your NHG Secretary to reset credentials.`,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Password reset request failed", error: error.message });
  }
};

// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  res.json(req.user);
};

module.exports = { registerUser, loginUser, getProfile, forgotPassword, createDemoBankOfficer };
