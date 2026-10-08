const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: [
        "MAIN_ADMIN",
        "NHG_SECRETARY",
        "MEMBER",
        "super_admin",
        "superadmin",
        "secretary",
        "member",
        "ads_cds_officer",
        "ads_officer",
        "cds_officer",
        "bank_officer",
      ],
      required: true,
      default: "MEMBER",
    },
    // Unique identifier of the NHG (e.g. NHG001)
    nhgId: {
      type: String,
      trim: true,
    },
    // Which NHG (Neighbourhood Group) this user belongs to
    nhgName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    // Unique code embedded in each member's QR for attendance scanning
    qrCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Kudumbashree Member ID linkage (e.g. KC00001)
    memberId: {
      type: String,
      trim: true,
    },
    creditScore: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      tier: { type: String, enum: ["Excellent", "Good", "Fair", "Needs Improvement"], default: "Fair" },
      attendancePercent: { type: Number, min: 0, max: 100, default: 0 },
      thriftConsistencyPercent: { type: Number, min: 0, max: 100, default: 0 },
      onTimeRepaymentPercent: { type: Number, min: 0, max: 100, default: 100 },
      calculatedAt: { type: Date, default: Date.now },
    },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetCodeHash: { type: String, select: false },
    passwordResetCodeExpires: { type: Date, select: false },
    passwordResetCodeAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
