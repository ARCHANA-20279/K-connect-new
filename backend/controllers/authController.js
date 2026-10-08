const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");

const hashResetCode = (code) => crypto
  .createHmac("sha256", process.env.JWT_SECRET || "kconnect_secret")
  .update(String(code))
  .digest("hex");

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
    const { password, role, nhgName } = req.body;
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phoneInput = String(req.body.phone || "").trim();
    const phoneDigits = phoneInput.replace(/\D/g, "");

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    if (phoneInput && phoneDigits.length !== 10) return res.status(400).json({ message: "Phone number must contain 10 digits." });

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
          phone: phoneDigits || "Not Provided",
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
      phone: phoneDigits,
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
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please provide your registered email address" });
    }
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(503).json({ message: "Password reset email is not configured. Please ask the site administrator to configure the email service." });
    }
    const user = await User.findOne({ email }).select("+passwordResetCodeHash +passwordResetCodeExpires +passwordResetCodeAttempts +passwordResetTokenHash +passwordResetExpires");
    if (user) {
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      user.passwordResetCodeHash = hashResetCode(code);
      user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.passwordResetCodeAttempts = 0;
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      const displayName = String(user.name || "member");
      const safeName = displayName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const mailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [email],
          subject: "Your K-Connect password reset code",
          text: `Hello ${displayName},\n\nYour K-Connect password reset code is ${code}. It expires in 10 minutes and can be used once.\n\nIf you did not request this, ignore this email.`,
          html: `<p>Hello ${safeName},</p><p>Your K-Connect password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes and can be used once.</p><p>If you did not request this, ignore this email.</p>`,
        }),
      });
      if (!mailResponse.ok) {
        user.passwordResetCodeHash = undefined;
        user.passwordResetCodeExpires = undefined;
        user.passwordResetCodeAttempts = 0;
        await user.save();
        console.error("Password reset email provider returned an error:", await mailResponse.text());
        return res.status(502).json({ message: "The reset email could not be sent. Please try again later or contact your NHG Secretary." });
      }
    }
    return res.status(200).json({
      message: "If an account exists with this email, a reset code has been sent. It expires in 10 minutes.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Password reset request failed. Please try again later." });
  }
};

const resetPasswordWithCode = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const password = String(req.body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Enter the registered email and the 6-digit reset code." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Choose a password with at least 8 characters." });

    const user = await User.findOne({ email }).select("+passwordResetCodeHash +passwordResetCodeExpires +passwordResetCodeAttempts +passwordResetTokenHash +passwordResetExpires");
    const expired = !user?.passwordResetCodeExpires || user.passwordResetCodeExpires <= new Date();
    if (!user || expired || !user.passwordResetCodeHash || user.passwordResetCodeAttempts >= 5) {
      return res.status(400).json({ message: "The code is invalid or expired. Request a new code." });
    }

    const suppliedHash = Buffer.from(hashResetCode(code), "hex");
    const storedHash = Buffer.from(user.passwordResetCodeHash, "hex");
    const matches = suppliedHash.length === storedHash.length && crypto.timingSafeEqual(suppliedHash, storedHash);
    if (!matches) {
      user.passwordResetCodeAttempts += 1;
      if (user.passwordResetCodeAttempts >= 5) {
        user.passwordResetCodeHash = undefined;
        user.passwordResetCodeExpires = undefined;
      }
      await user.save();
      return res.status(400).json({ message: "The code is invalid or expired. Request a new code." });
    }

    user.password = password;
    user.passwordResetCodeHash = undefined;
    user.passwordResetCodeExpires = undefined;
    user.passwordResetCodeAttempts = 0;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return res.json({ message: "Your password has been changed. You can now sign in." });
  } catch (error) {
    console.error("Password reset code error:", error);
    return res.status(500).json({ message: "Password could not be changed. Request a new reset code." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const password = String(req.body.password || "");
    if (!/^[a-f0-9]{64}$/i.test(token || "")) return res.status(400).json({ message: "This reset link is invalid or expired. Request a new one." });
    if (password.length < 8) return res.status(400).json({ message: "Choose a password with at least 8 characters." });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpires: { $gt: new Date() } }).select("+passwordResetTokenHash +passwordResetExpires");
    if (!user) return res.status(400).json({ message: "This reset link is invalid or expired. Request a new one." });
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return res.json({ message: "Your password has been changed. You can now sign in." });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "Password could not be changed. Please request a new reset link." });
  }
};

// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  res.json(req.user);
};

module.exports = { registerUser, loginUser, getProfile, forgotPassword, resetPassword, resetPasswordWithCode, createDemoBankOfficer };
