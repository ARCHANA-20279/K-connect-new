const Attendance = require("../models/Attendance");
const Loan = require("../models/Loan");
const Meeting = require("../models/Meeting");
const Member = require("../models/Member");
const Thrift = require("../models/Thrift");
const User = require("../models/User");

const tierFor = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Improvement";
};

const loanLimitMultiplier = (tier) => ({
  Excellent: 1,
  Good: 0.8,
  Fair: 0.65,
  "Needs Improvement": 0.5,
}[tier] || 0.5);

const parseDepositDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateCreditScore = async (memberId) => {
  const member = await Member.findOne({ memberId, status: "Active" });
  if (!member) throw new Error("Active member profile not found for credit scoring.");

  const nhgConditions = [];
  if (member.nhgId) nhgConditions.push({ nhgId: member.nhgId });
  if (member.nhgName) nhgConditions.push({ nhgName: member.nhgName });
  const nhgFilter = nhgConditions.length > 1 ? { $or: nhgConditions } : (nhgConditions[0] || {});
  const completedMeetings = await Meeting.find({ ...nhgFilter, status: "Completed" }).select("_id");
  const meetingIds = completedMeetings.map((meeting) => meeting._id);
  const presentCount = meetingIds.length
    ? await Attendance.countDocuments({ memberId, meetingId: { $in: meetingIds }, status: "Present" })
    : 0;
  const attendancePercent = meetingIds.length
    ? Math.min(100, Math.round((presentCount / meetingIds.length) * 100))
    : 50;

  const deposits = await Thrift.find({ memberId }).select("date createdAt");
  const now = new Date();
  const start = member.joinDate && member.joinDate > (deposits.length ? new Date(Math.min(...deposits.map((d) => (parseDepositDate(d.date) || d.createdAt).getTime()))) : now)
    ? member.joinDate
    : deposits.length
      ? new Date(Math.min(...deposits.map((d) => (parseDepositDate(d.date) || d.createdAt).getTime())))
      : now;
  const weeksObserved = Math.min(12, Math.max(1, Math.ceil((now - start) / (7 * 24 * 60 * 60 * 1000))));
  const depositWeeks = new Set();
  for (const deposit of deposits) {
    const date = parseDepositDate(deposit.date) || deposit.createdAt;
    if (!date || date < now - 12 * 7 * 24 * 60 * 60 * 1000) continue;
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    depositWeeks.add(weekStart.toISOString().slice(0, 10));
  }
  const thriftConsistencyPercent = Math.min(100, Math.round((depositWeeks.size / weeksObserved) * 100));

  const loans = await Loan.find({ memberId }).select("repayments");
  const verifiedRepayments = loans.flatMap((loan) => loan.repayments || []).filter((payment) => payment.status === "Verified" && payment.onTime !== null);
  // No repayment history is neutral: it does not count as a missed payment.
  const onTimeRepaymentPercent = verifiedRepayments.length
    ? Math.round((verifiedRepayments.filter((payment) => payment.onTime === true).length / verifiedRepayments.length) * 100)
    : 100;

  // Score = attendance (40%) + weekly thrift consistency (30%) + verified on-time repayments (30%).
  const score = Math.round(attendancePercent * 0.4 + thriftConsistencyPercent * 0.3 + onTimeRepaymentPercent * 0.3);
  const tier = tierFor(score);
  const creditScore = {
    score,
    tier,
    attendancePercent,
    thriftConsistencyPercent,
    onTimeRepaymentPercent,
    calculatedAt: now,
  };
  let linkedUser = await User.findOneAndUpdate({ memberId }, { $set: { creditScore } }, { new: true });
  if (!linkedUser && member.email) {
    linkedUser = await User.findOneAndUpdate({ email: member.email.toLowerCase() }, { $set: { creditScore } }, { new: true });
  }

  return { ...creditScore, loanLimitMultiplier: loanLimitMultiplier(tier) };
};

module.exports = { calculateCreditScore, loanLimitMultiplier };
