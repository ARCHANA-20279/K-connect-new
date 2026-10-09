const Loan = require("../models/Loan");
const NHG = require("../models/NHG");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const Thrift = require("../models/Thrift");
const { calculateCreditScore } = require("../services/creditScoreService");

const roleOf = (user) => (user?.role || "").toLowerCase();
const isMainAdmin = (role) => ["main_admin", "super_admin", "superadmin"].includes((role || "").toLowerCase());
const isSecretary = (role) => ["secretary", "nhg_secretary"].includes((role || "").toLowerCase());
const isAds = (role) => ["ads_officer", "ads_cds_officer"].includes((role || "").toLowerCase());
const isCds = (role) => ["cds_officer", "ads_cds_officer"].includes((role || "").toLowerCase());
const isBankOfficer = (role) => (role || "").toLowerCase() === "bank_officer";
const sameNhg = (user, loan) => Boolean(
  (user?.nhgId && loan.nhgId === user.nhgId) ||
  (user?.nhgName && loan.nhgName === user.nhgName)
);
const getAdsReviewArea = async (user) => {
  let assignedNhg = user?.nhgId ? await NHG.findOne({ nhgId: user.nhgId }) : null;
  if (!assignedNhg && user?.nhgName) {
    const escapedName = user.nhgName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assignedNhg = await NHG.findOne({ name: { $regex: `^${escapedName}$`, $options: "i" } });
  }
  if (!assignedNhg) return { ids: [], names: [] };

  // ADS accounts link to one NHG at registration, but their queue covers the
  // ward's NHGs. Match the shared ADS name or ward within the same local body
  // so inconsistent ADS labels don't hide secretary-forwarded applications.
  const locality = {};
  if (assignedNhg.district?.trim()) locality.district = assignedNhg.district.trim();
  if (assignedNhg.localBodyType) locality.localBodyType = assignedNhg.localBodyType;
  if (assignedNhg.localBodyName?.trim()) locality.localBodyName = assignedNhg.localBodyName.trim();
  const areaClauses = [];
  if (assignedNhg.adsName?.trim()) {
    const escapedAdsName = assignedNhg.adsName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    areaClauses.push({ ...locality, adsName: { $regex: `^${escapedAdsName}$`, $options: "i" } });
  }
  if (assignedNhg.ward?.trim()) areaClauses.push({ ...locality, ward: assignedNhg.ward.trim() });
  areaClauses.push({ _id: assignedNhg._id });
  const areaNhgs = await NHG.find({ $or: areaClauses }).select("nhgId name");
  const ids = areaNhgs.map((nhg) => nhg.nhgId).filter(Boolean);
  const names = areaNhgs.map((nhg) => nhg.name).filter(Boolean);
  return ids.length || names.length ? { ids, names } : { ids: [assignedNhg.nhgId].filter(Boolean), names: [assignedNhg.name].filter(Boolean) };
};
const loansInAdsAreaFilter = async (user) => {
  const fallbackFilter = nhgFilterFor(user);
  if (!fallbackFilter) return null;
  const area = await getAdsReviewArea(user);
  const areaClauses = [
    ...(area.ids.length ? [{ nhgId: { $in: area.ids } }] : []),
    ...(area.names.length ? [{ nhgName: { $in: area.names } }] : []),
  ];
  const memberFilter = areaClauses.length ? { $or: areaClauses } : fallbackFilter;
  const membersInArea = await Member.find(memberFilter).select("memberId");
  const memberIds = membersInArea.map((member) => member.memberId);
  const loanClauses = [...areaClauses, ...(memberIds.length ? [{ memberId: { $in: memberIds } }] : [])];
  return loanClauses.length ? { $or: loanClauses } : fallbackFilter;
};
const nhgFilterFor = (user) => {
  const conditions = [];
  if (user?.nhgId) conditions.push({ nhgId: user.nhgId });
  if (user?.nhgName) conditions.push({ nhgName: user.nhgName });
  return conditions.length ? { $or: conditions } : null;
};
const addHistory = (loan, user, stage, decision, reference = "", remarks = "") => {
  loan.workflowHistory.push({
    stage,
    decision,
    actor: user?.name || "",
    actorRole: roleOf(user),
    reference,
    remarks,
    at: new Date(),
  });
};
const canReviewNhgLoan = (user, loan) => isMainAdmin(roleOf(user)) || sameNhg(user, loan);
const getRecordedThriftTotal = async (memberId) => {
  const [result] = await Thrift.aggregate([
    { $match: { memberId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return Number(result?.total) || 0;
};
const thriftLimitMessage = (amount, savings) =>
  `Requested loan amount ₹${Number(amount).toLocaleString("en-IN")} exceeds the member's recorded thrift total of ₹${Number(savings).toLocaleString("en-IN")}. The demo policy does not allow sanctioning above recorded thrift.`;

const createLoan = async (req, res) => {
  try {
    const member = await Member.findOne({ memberId: req.user.memberId, status: "Active" });
    if (!member) return res.status(404).json({ message: "Your active member profile could not be found. Please contact your NHG Secretary." });
    const { loanType, amount, purpose } = req.body;
    if (!loanType || !purpose || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Loan type, purpose, and a valid amount are required." });
    }
    const thriftTotal = await getRecordedThriftTotal(member.memberId);
    const creditScore = await calculateCreditScore(member.memberId);
    const maximumLoanAmount = Math.floor(thriftTotal * creditScore.loanLimitMultiplier);
    if (Number(amount) > maximumLoanAmount) {
      return res.status(400).json({
        message: `Your current ${creditScore.tier} trust score allows a loan up to ₹${maximumLoanAmount.toLocaleString("en-IN")}. This limit remains within your recorded thrift of ₹${thriftTotal.toLocaleString("en-IN")}.`,
        thriftTotal,
        maximumLoanAmount,
        creditScore,
      });
    }
    const nhgName = member.nhgName || req.user.nhgName || "";
    let nhgId = member.nhgId || req.user.nhgId || "";
    if (!nhgId && nhgName) {
      const foundNhg = await NHG.findOne({ name: nhgName });
      nhgId = foundNhg?.nhgId || "";
    }
    const groupFilter = nhgId ? { nhgId } : { nhgName };
    const voters = await Member.find({ ...groupFilter, status: "Active", memberId: { $ne: member.memberId } }).select("memberId name");
    const requiredApprovals = Math.floor(voters.length / 2) + 1;
    if (voters.length === 0) return res.status(400).json({ message: "At least one other active NHG member is required for peer approval." });
    const loanCount = await Loan.countDocuments({});
    const loanId = `LN-${String(loanCount + 1001)}`;
    const loan = await Loan.create({
      memberId: member.memberId,
      memberName: member.name,
      loanType: loanType.trim(),
      amount: Number(amount),
      purpose: purpose.trim(),
      status: "NHG Voting",
      loanId,
      nhgName,
      nhgId,
      peerApproval: { eligibleVoterIds: voters.map((voter) => voter.memberId), requiredApprovals, votes: [] },
      workflowHistory: [{ stage: "Member", decision: "Application submitted", actor: member.name, actorRole: "member", at: new Date() }],
    });
    try {
      await Notification.insertMany(voters.map((voter) => ({
        title: `NHG loan vote requested: ${member.name}`,
        message: `${member.name} has requested ₹${Number(amount).toLocaleString("en-IN")} (${loan.loanId}). Review the request and cast your NHG vote.`,
        type: "LOAN",
        recipientRole: "member",
        recipientMemberId: voter.memberId,
        targetAudience: "NHG Peer Loan Vote",
        category: "NHG Loan Vote",
        createdBy: member.name,
        nhgName,
        nhgId,
        relatedLoan: loan._id,
      })));
    } catch (notificationError) {
      console.warn("Could not create NHG peer vote notifications:", notificationError.message);
    }
    req.app.get("io")?.to(`nhg:${nhgId || nhgName}`).emit("loan:vote-request", { loanId: loan._id, loanCode: loan.loanId, memberName: member.name, amount: loan.amount, purpose: loan.purpose });
    res.status(201).json({ message: "Loan request sent to NHG members for peer approval.", loan, creditScore, maximumLoanAmount });
  } catch (error) {
    console.error("Create loan error:", error);
    res.status(500).json({ message: "Failed to create loan application", error: error.message });
  }
};

const getMyCreditScore = async (req, res) => {
  try {
    const member = await Member.findOne({ memberId: req.user.memberId, status: "Active" });
    if (!member) return res.status(404).json({ message: "Your active member profile could not be found." });
    const creditScore = await calculateCreditScore(member.memberId);
    const thriftTotal = await getRecordedThriftTotal(member.memberId);
    res.json({ creditScore, thriftTotal, maximumLoanAmount: Math.floor(thriftTotal * creditScore.loanLimitMultiplier) });
  } catch (error) {
    console.error("Credit score calculation error:", error);
    res.status(500).json({ message: "Could not calculate your trust score." });
  }
};

const castPeerVote = async (req, res) => {
  try {
    const member = await Member.findOne({ memberId: req.user.memberId, status: "Active" });
    if (!member) return res.status(403).json({ message: "An active NHG member profile is required to vote." });
    const decision = req.body.decision;
    if (!["Approve", "Reject"].includes(decision)) return res.status(400).json({ message: "Choose approve or reject." });
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found." });
    if (loan.status !== "NHG Voting") return res.status(400).json({ message: "This loan is no longer accepting NHG votes." });
    if (loan.memberId === member.memberId) return res.status(403).json({ message: "You cannot vote on your own loan request." });
    if (!loan.peerApproval.eligibleVoterIds.includes(member.memberId)) return res.status(403).json({ message: "You are not in this request's NHG voter group." });
    const recorded = await Loan.findOneAndUpdate(
      { _id: loan._id, status: "NHG Voting", "peerApproval.eligibleVoterIds": member.memberId, "peerApproval.votes.memberId": { $ne: member.memberId } },
      { $push: { "peerApproval.votes": { memberId: member.memberId, memberName: member.name, decision, votedAt: new Date() } } },
      { new: true, projection: { _id: 1 } }
    );
    if (!recorded) return res.status(409).json({ message: "Your vote has already been recorded or voting has closed." });
    const updated = await Loan.findById(loan._id);
    const approvals = updated.peerApproval.votes.filter((vote) => vote.decision === "Approve").length;
    const rejections = updated.peerApproval.votes.filter((vote) => vote.decision === "Reject").length;
    const allVoted = updated.peerApproval.votes.length >= updated.peerApproval.eligibleVoterIds.length;
    let finalized = false;
    if (approvals >= updated.peerApproval.requiredApprovals) {
      const result = await Loan.updateOne(
        { _id: updated._id, status: "NHG Voting" },
        {
          $set: { status: "Pending", "peerApproval.completedAt": new Date() },
          $push: { workflowHistory: { stage: "NHG Peer Vote", decision: "Majority approved; sent to NHG Secretary", actor: req.user?.name || "", actorRole: roleOf(req.user), reference: "", remarks: `${approvals}/${updated.peerApproval.eligibleVoterIds.length} approvals`, at: new Date() } },
        }
      );
      finalized = result.modifiedCount > 0;
    } else if (allVoted) {
      const result = await Loan.updateOne(
        { _id: updated._id, status: "NHG Voting" },
        {
          $set: { status: "Rejected", rejectionReason: "NHG peer vote did not reach majority approval.", "peerApproval.completedAt": new Date() },
          $push: { workflowHistory: { stage: "NHG Peer Vote", decision: "Rejected; majority not reached", actor: req.user?.name || "", actorRole: roleOf(req.user), reference: "", remarks: `${approvals} approvals, ${rejections} rejections`, at: new Date() } },
        }
      );
      finalized = result.modifiedCount > 0;
    }
    const current = finalized ? await Loan.findById(updated._id) : updated;
    if (finalized && current.status === "Pending") {
      try {
        await Notification.create({
          title: `Loan ready for Secretary review: ${current.memberName}`,
          message: `${current.memberName}'s loan request ${current.loanId} for ₹${Number(current.amount).toLocaleString("en-IN")} has received NHG member approval and is waiting for your review.`,
          type: "LOAN",
          recipientRole: "secretary",
          targetAudience: `NHG Secretary${current.nhgName ? ` — ${current.nhgName}` : ""}`,
          category: "NHG Secretary Loan Review",
          createdBy: req.user?.name || "NHG Members",
          nhgName: current.nhgName,
          nhgId: current.nhgId,
          relatedLoan: current._id,
        });
      } catch (notificationError) {
        // The peer vote remains successful even if notification storage is temporarily unavailable.
        console.warn("Could not create NHG Secretary loan notification:", notificationError.message);
      }
    }
    req.app.get("io")?.to(`nhg:${current.nhgId || current.nhgName}`).emit("loan:vote-update", { loanId: current._id, status: current.status, approvals, rejections, requiredApprovals: current.peerApproval.requiredApprovals, totalVoters: current.peerApproval.eligibleVoterIds.length });
    res.json({ message: "Your NHG vote has been recorded.", loan: current });
  } catch (error) {
    console.error("Peer loan vote error:", error);
    res.status(500).json({ message: "Failed to record NHG vote.", error: error.message });
  }
};

const getAllLoans = async (req, res) => {
  try {
    const user = req.user;
    const role = roleOf(user);
    let query = {};
    if (isSecretary(role)) {
      const filter = nhgFilterFor(user);
      if (!filter) return res.status(403).json({ message: "Your account is not linked to an NHG." });
      query = filter;
    } else if (role === "member") {
      const group = [];
      let member = user.memberId ? await Member.findOne({ memberId: user.memberId, status: "Active" }) : null;
      if (!member) member = await Member.findOne({ email: (user.email || "").toLowerCase(), status: "Active" });
      if (member?.nhgId) group.push({ nhgId: member.nhgId });
      if (member?.nhgName) group.push({ nhgName: member.nhgName });
      query = { $or: [
        { memberId: user.memberId || "__unlinked_member__" },
        ...(group.length ? [{ status: "NHG Voting", peerApproval: { $exists: true }, $or: group }] : []),
      ] };
    } else if (isAds(role) && req.query.scope === "ads") {
      // The dedicated ADS desk is the workflow handoff queue. NHG-level
      // metadata can be inconsistent across older records, so the current
      // review stage is the authoritative assignment for these applications.
      query = { status: "ADS Review" };
    } else if (isCds(role)) {
      // CDS reviews applications forwarded from ADS across all constituent NHGs.
      query = {};
    } else if (isBankOfficer(role)) {
      query.status = { $in: ["Bank Review", "Bank Approved"] };
    } else if (isAds(role)) {
      const filter = await loansInAdsAreaFilter(user);
      if (!filter) return res.status(403).json({ message: "Your ADS/CDS account must be linked to its review area." });
      query = filter;
    } else if (isMainAdmin(role)) {
      if (req.query.nhgId) query.nhgId = req.query.nhgId;
      else if (req.query.nhgName) query.nhgName = req.query.nhgName;
    } else {
      return res.status(403).json({ message: "You do not have access to loan records." });
    }
    res.status(200).json(await Loan.find(query).sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Get loans error:", error);
    res.status(500).json({ message: "Failed to fetch loans", error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const user = req.user;
    const role = roleOf(user);
    if (role === "member" && loan.memberId !== user.memberId) return res.status(403).json({ message: "You can only view your own loan applications." });
    if (isBankOfficer(role) && !["Bank Review", "Bank Approved"].includes(loan.status)) return res.status(403).json({ message: "Demo Bank Officers can only view applications forwarded to the bank stage." });
    if (isSecretary(role) && !canReviewNhgLoan(user, loan)) return res.status(403).json({ message: "This loan is outside your assigned review area." });
    if (isAds(role) && !isCds(role) && loan.status !== "ADS Review") return res.status(403).json({ message: "This loan is not waiting in the ADS review queue." });
    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch loan", error: error.message });
  }
};

const secretaryReview = async (req, res) => {
  try {
    const { eligible, meetingResolution, remarks = "" } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (!canReviewNhgLoan(req.user, loan)) return res.status(403).json({ message: "This loan belongs to another NHG." });
    if (loan.status !== "Pending") return res.status(400).json({ message: "This application is no longer waiting for NHG review." });
    const thriftTotal = await getRecordedThriftTotal(loan.memberId);
    if (Number(loan.amount) > thriftTotal) {
      return res.status(400).json({ message: thriftLimitMessage(loan.amount, thriftTotal), thriftTotal });
    }
    if (eligible !== true) return res.status(400).json({ message: "Confirm that the member's eligibility has been checked before forwarding." });
    const resolution = (meetingResolution || "").trim();
    if (!resolution) return res.status(400).json({ message: "Enter the NHG meeting resolution or minutes reference." });
    loan.secretaryReview = { eligible: true, meetingResolution: resolution, remarks, reviewedBy: req.user.name, reviewedAt: new Date() };
    loan.status = "ADS Review";
    addHistory(loan, req.user, "NHG Secretary", "Eligibility verified; sent to ADS", resolution, remarks);
    await loan.save();
    try {
      await Notification.create({
        title: `ADS verification needed: ${loan.memberName}`,
        message: `Loan ${loan.loanId} for ₹${Number(loan.amount).toLocaleString("en-IN")} has passed NHG Secretary review. Please verify the eligibility and meeting resolution, then approve or reject it.`,
        type: "LOAN",
        recipientRole: "ads_officer",
        targetAudience: `ADS Officers for ${loan.nhgName || "the assigned NHG"}`,
        category: "ADS Loan Verification",
        createdBy: req.user.name || "NHG Secretary",
        nhgName: loan.nhgName,
        nhgId: loan.nhgId,
        relatedLoan: loan._id,
      });
    } catch (notificationError) {
      console.warn("Could not create ADS loan notification:", notificationError.message);
    }
    res.json({ message: "Secretary review recorded; forwarded to ADS.", loan });
  } catch (error) {
    res.status(500).json({ message: "Failed to record secretary review", error: error.message });
  }
};

const approveAtLevel = (level) => async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const expectedStatus = level === "ADS" ? "ADS Review" : "CDS Review";
    if (loan.status !== expectedStatus) return res.status(400).json({ message: `This loan is not awaiting ${level} review.` });
    const thriftTotal = await getRecordedThriftTotal(loan.memberId);
    if (Number(loan.amount) > thriftTotal) {
      return res.status(400).json({ message: thriftLimitMessage(loan.amount, thriftTotal), thriftTotal });
    }
    const reference = (req.body.reference || "").trim();
    if (!reference) return res.status(400).json({ message: `Enter the ${level} meeting or review reference.` });
    const remarks = (req.body.remarks || "").trim();
    loan.status = level === "ADS" ? "CDS Review" : "Bank Review";
    addHistory(loan, req.user, level, level === "ADS" ? "Approved; sent to CDS" : "Verified; forwarded to Bank", reference, remarks);
    await loan.save();
    if (level === "ADS") {
      try {
        await Notification.create({
          title: `CDS verification needed: ${loan.memberName}`,
          message: `Loan ${loan.loanId} for ₹${Number(loan.amount).toLocaleString("en-IN")} has been approved by ADS. Please verify the application and forward it to the bank.`,
          type: "LOAN",
          recipientRole: "cds_officer",
          targetAudience: "CDS Loan Review Desk",
          category: "CDS Loan Verification",
          createdBy: req.user.name || "ADS Officer",
          nhgName: loan.nhgName,
          nhgId: loan.nhgId,
          relatedLoan: loan._id,
        });
      } catch (notificationError) {
        console.warn("Could not create CDS loan notification:", notificationError.message);
      }
    } else {
      try {
        await Notification.create({
          title: `Demo bank review needed: ${loan.memberName}`,
          message: `Loan ${loan.loanId} has passed CDS review and is ready for a simulated bank decision in K-Connect. No real bank transfer is made by this project.`,
          type: "LOAN",
          recipientRole: "bank_officer",
          targetAudience: "K-Connect Demo Bank Review Desk",
          category: "Demo Bank Review",
          createdBy: req.user.name || "CDS Officer",
          nhgName: loan.nhgName,
          nhgId: loan.nhgId,
          relatedLoan: loan._id,
        });
      } catch (notificationError) {
        console.warn("Could not create demo bank review notification:", notificationError.message);
      }
    }
    res.json({ message: level === "ADS" ? "ADS approval recorded; sent to CDS." : "CDS verification recorded; forwarded to the Bank.", loan });
  } catch (error) {
    res.status(500).json({ message: `Failed to record ${level} review`, error: error.message });
  }
};

const recordBankDecision = async (req, res) => {
  try {
    const { decision, reference, approvedAmount, interestRate, paymentScheduleReference, remarks = "" } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (!["Bank Review", "Bank Approved"].includes(loan.status)) return res.status(400).json({ message: "This application is not awaiting a bank decision or disbursement." });
    if (!reference?.trim()) return res.status(400).json({ message: "Enter the bank decision or communication reference." });
    const thriftTotal = await getRecordedThriftTotal(loan.memberId);
    if (loan.status === "Bank Approved" && decision === "Disbursed") {
      if (Number(loan.approvedAmount) > thriftTotal) {
        return res.status(400).json({ message: thriftLimitMessage(loan.approvedAmount, thriftTotal), thriftTotal });
      }
      loan.status = "Repayment";
      loan.remainingAmount = loan.approvedAmount;
      loan.sanctionDate = new Date();
      loan.bankDecision.disbursementReference = reference.trim();
      loan.bankDecision.disbursedAt = new Date();
      loan.remarks = remarks;
      addHistory(loan, req.user, "Bank", "Demo disbursement recorded", reference.trim(), remarks);
      await loan.save();
      return res.json({ message: "Demo disbursement recorded in K-Connect. This does not transfer funds; the member can now submit project EMI records.", loan });
    }
    if (decision === "Declined" && loan.status === "Bank Review") {
      if (!remarks?.trim()) return res.status(400).json({ message: "Enter a clear reason for declining this application; the member will see it." });
      loan.status = "Rejected";
      loan.rejectionReason = remarks.trim();
      loan.bankDecision = { reference: reference.trim(), decidedBy: req.user.name, decidedAt: new Date(), paymentScheduleReference };
      addHistory(loan, req.user, "Bank", "Demo bank decision: declined", reference.trim(), remarks.trim());
      await loan.save();
      return res.json({ message: "Demo bank decline recorded.", loan });
    }
    const amount = Number(approvedAmount);
    const rate = Number(interestRate);
    if (decision !== "Approved" || loan.status !== "Bank Review" || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rate) || rate < 0) {
      return res.status(400).json({ message: "Record the bank's approval with its approved amount and interest rate, then record disbursement separately." });
    }
    if (amount > thriftTotal) {
      return res.status(400).json({ message: thriftLimitMessage(amount, thriftTotal), thriftTotal });
    }
    loan.status = "Bank Approved";
    loan.approvedAmount = amount;
    loan.interestRate = rate;
    loan.bankDecision = { reference: reference.trim(), decidedBy: req.user.name, decidedAt: new Date(), bankInterestRate: rate, paymentScheduleReference: (paymentScheduleReference || "").trim() };
    loan.remarks = remarks;
    addHistory(loan, req.user, "Bank", "Demo bank approval; awaiting simulated disbursement", reference.trim(), remarks);
    await loan.save();
    res.json({ message: "Demo bank approval recorded. Record the simulated disbursement as the next project step.", loan });
  } catch (error) {
    res.status(500).json({ message: "Failed to record bank decision", error: error.message });
  }
};

const rejectLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const role = roleOf(req.user);
    const stageForStatus = { Pending: "NHG Secretary", "ADS Review": "ADS", "CDS Review": "CDS", "Bank Review": "Bank" };
    const expectedStage = stageForStatus[loan.status];
    let permitted = false;
    if (expectedStage === "NHG Secretary") permitted = isSecretary(role) && canReviewNhgLoan(req.user, loan);
    else if (expectedStage === "ADS") permitted = isAds(role);
    else if (expectedStage === "CDS") permitted = isCds(role);
    else if (expectedStage === "Bank") permitted = isMainAdmin(role) || isBankOfficer(role);
    if (!permitted) return res.status(403).json({ message: "You cannot reject this application at its current stage." });
    if (!req.body.reason?.trim()) return res.status(400).json({ message: "Enter a reason for declining this application." });
    loan.status = "Rejected";
    loan.rejectionReason = req.body.reason.trim();
    addHistory(loan, req.user, expectedStage, "Rejected", (req.body.reference || "").trim(), loan.rejectionReason);
    await loan.save();
    res.json({ message: "Decision recorded.", loan });
  } catch (error) {
    res.status(500).json({ message: "Failed to record rejection", error: error.message });
  }
};

const submitRepayment = async (req, res) => {
  try {
    const { amount, paymentDate, dueDate, receiptReference } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const role = roleOf(req.user);
    if (role === "member" && loan.memberId !== req.user.memberId) return res.status(403).json({ message: "You can only submit payments for your own loan." });
    if (isSecretary(role) && !canReviewNhgLoan(req.user, loan)) return res.status(403).json({ message: "This loan belongs to another NHG." });
    if (!["Repayment", "Approved"].includes(loan.status)) return res.status(400).json({ message: "EMI payment can be submitted after the bank records a disbursement." });
    const value = Number(amount);
    const date = new Date(paymentDate || Date.now());
    const due = dueDate ? new Date(dueDate) : null;
    if (!Number.isFinite(value) || value <= 0 || Number.isNaN(date.getTime()) || (due && Number.isNaN(due.getTime()))) return res.status(400).json({ message: "Enter a valid payment amount and date." });
    const outstanding = Math.max(0, Number(loan.remainingAmount || 0));
    const awaiting = loan.repayments.filter((r) => r.status === "Submitted").reduce((sum, r) => sum + r.amount, 0);
    if (value > outstanding - awaiting) return res.status(400).json({ message: "Payment is greater than the outstanding balance after pending receipts." });
    const isSecretaryEntry = isSecretary(role);
    const repayment = { amount: value, paymentDate: date, dueDate: due, receiptReference: (receiptReference || "").trim(), status: isSecretaryEntry ? "Verified" : "Submitted", recordedBy: req.user.name, verifiedBy: isSecretaryEntry ? req.user.name : "", verifiedAt: isSecretaryEntry ? new Date() : undefined, onTime: isSecretaryEntry && due ? date <= due : null, subsidyReview: isSecretaryEntry && due && date <= due ? "Potential 5% candidate; bank/program eligibility not confirmed" : "Awaiting secretary verification", remarks: "" };
    loan.repayments.push(repayment);
    if (isSecretaryEntry) {
      loan.repaymentAmount += value;
      loan.remainingAmount = Math.max(0, loan.approvedAmount - loan.repaymentAmount);
      if (loan.remainingAmount === 0) loan.status = "Completed";
    }
    addHistory(loan, req.user, "Repayment", isSecretaryEntry ? "Payment recorded and verified" : "Member payment submitted for verification", repayment.receiptReference, "");
    await loan.save();
    res.status(201).json({ message: isSecretaryEntry ? "EMI payment recorded." : "Payment reference submitted; the NHG Secretary must verify it.", loan });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit EMI payment", error: error.message });
  }
};

const verifyRepayment = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (!isSecretary(roleOf(req.user)) || !canReviewNhgLoan(req.user, loan)) return res.status(403).json({ message: "Only this member's NHG Secretary can verify the payment." });
    const repayment = loan.repayments.id(req.params.repaymentId);
    if (!repayment || repayment.status !== "Submitted") return res.status(404).json({ message: "Pending EMI payment not found." });
    if (req.body.decision === "Reject") {
      repayment.status = "Rejected";
      repayment.remarks = (req.body.remarks || "Payment could not be verified.").trim();
    } else if (req.body.decision === "Verify") {
      if (repayment.amount > loan.remainingAmount) return res.status(400).json({ message: "Verified payment exceeds the outstanding balance." });
      if (req.body.dueDate) {
        const verifiedDueDate = new Date(req.body.dueDate);
        if (Number.isNaN(verifiedDueDate.getTime())) return res.status(400).json({ message: "Enter a valid EMI due date from the bank schedule." });
        repayment.dueDate = verifiedDueDate;
      }
      repayment.status = "Verified";
      repayment.verifiedBy = req.user.name;
      repayment.verifiedAt = new Date();
      repayment.onTime = repayment.dueDate ? repayment.paymentDate <= repayment.dueDate : null;
      repayment.subsidyReview = repayment.onTime ? "Potential 5% candidate; bank/program eligibility and amount require confirmation" : "No on-time candidate; late or missing due date";
      repayment.remarks = (req.body.remarks || "").trim();
      loan.repaymentAmount += repayment.amount;
      loan.remainingAmount = Math.max(0, loan.approvedAmount - loan.repaymentAmount);
      if (loan.remainingAmount === 0) loan.status = "Completed";
    } else {
      return res.status(400).json({ message: "Choose Verify or Reject." });
    }
    addHistory(loan, req.user, "Repayment verification", repayment.status, repayment.receiptReference, repayment.remarks);
    await loan.save();
    if (repayment.status === "Verified") {
      await calculateCreditScore(loan.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));
    }
    res.json({ message: `EMI payment ${repayment.status.toLowerCase()}.`, loan });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify EMI payment", error: error.message });
  }
};

module.exports = {
  createLoan,
  getMyCreditScore,
  castPeerVote,
  getAllLoans,
  getLoanById,
  secretaryReview,
  adsReview: approveAtLevel("ADS"),
  cdsReview: approveAtLevel("CDS"),
  recordBankDecision,
  rejectLoan,
  submitRepayment,
  verifyRepayment,
};
