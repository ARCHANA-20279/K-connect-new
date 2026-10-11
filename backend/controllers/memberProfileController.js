const Member = require("../models/Member");
const User = require("../models/User");
const Notification = require("../models/Notification");
const MemberProfileUpdateRequest = require("../models/MemberProfileUpdateRequest");

const editableFields = ["name", "phone", "email", "address", "ward"];

const findOwnMember = async (user) => {
  let member = user.memberId
    ? await Member.findOne({ memberId: user.memberId, status: "Active" })
    : null;
  if (member?.email && user.email && member.email.toLowerCase() !== user.email.toLowerCase()) {
    member = null;
  }
  if (!member && user.email) {
    member = await Member.findOne({ email: user.email.toLowerCase(), status: "Active" });
  }
  return member;
};

const ownsNHG = (secretary, member) => Boolean(
  (secretary.nhgId && member.nhgId && secretary.nhgId === member.nhgId) ||
  (secretary.nhgName && member.nhgName && secretary.nhgName.toLowerCase() === member.nhgName.toLowerCase())
);

const serializeMember = (member, fallbackEmail = "") => ({
  _id: member._id,
  memberId: member.memberId,
  name: member.name,
  phone: member.phone,
  email: member.email || fallbackEmail || "",
  address: member.address,
  ward: member.ward,
  nhgId: member.nhgId || "",
  nhgName: member.nhgName || "",
  status: member.status,
});

const getOwnMemberProfile = async (req, res) => {
  try {
    const member = await findOwnMember(req.user);
    if (!member) return res.status(404).json({ message: "Your active NHG member profile could not be found." });

    const pendingRequest = await MemberProfileUpdateRequest.findOne({ member: member._id, status: "Pending" }).sort({ createdAt: -1 });
    return res.json({ profile: serializeMember(member, req.user.email), pendingRequest });
  } catch (error) {
    console.error("Get member profile error:", error);
    return res.status(500).json({ message: "Could not load your member profile." });
  }
};

const submitOwnProfileUpdate = async (req, res) => {
  try {
    const member = await findOwnMember(req.user);
    if (!member) return res.status(404).json({ message: "Your active NHG member profile could not be found." });

    const pending = await MemberProfileUpdateRequest.findOne({ member: member._id, status: "Pending" });
    if (pending) return res.status(409).json({ message: "Your previous profile update is still waiting for the NHG Secretary to review it." });

    const input = req.body.profile || req.body;
    const nextValues = {};
    for (const field of editableFields) {
      if (input[field] === undefined) continue;
      nextValues[field] = String(input[field] ?? "").trim();
    }

    if (nextValues.name !== undefined && nextValues.name.length < 2) {
      return res.status(400).json({ message: "Enter your full name." });
    }
    if (nextValues.phone !== undefined) {
      nextValues.phone = nextValues.phone.replace(/[\s()-]/g, "");
      if (!/^[6-9]\d{9}$/.test(nextValues.phone)) {
        return res.status(400).json({ message: "Enter a 10-digit Indian mobile number beginning with 6, 7, 8, or 9." });
      }
    }
    if (nextValues.email) {
      nextValues.email = nextValues.email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValues.email)) {
        return res.status(400).json({ message: "Enter a valid email address." });
      }
      const duplicateAccount = await User.findOne({ email: nextValues.email, _id: { $ne: req.user._id } });
      if (duplicateAccount) return res.status(409).json({ message: "That email is already used by another account." });
    } else if (nextValues.email !== undefined) {
      return res.status(400).json({ message: "Email cannot be blank because it is used for your sign-in." });
    }
    if (nextValues.address !== undefined && nextValues.address.length < 3) {
      return res.status(400).json({ message: "Enter your address." });
    }
    if (nextValues.ward !== undefined && !nextValues.ward) {
      return res.status(400).json({ message: "Enter your ward." });
    }

    const proposedChanges = {};
    for (const field of editableFields) {
      if (nextValues[field] === undefined) continue;
      const current = String(member[field] || "").trim();
      const proposed = nextValues[field];
      if (current.toLowerCase() !== proposed.toLowerCase()) {
        proposedChanges[field] = { from: current, to: proposed };
      }
    }
    if (!Object.keys(proposedChanges).length) {
      return res.status(400).json({ message: "There are no changes to submit." });
    }

    const request = await MemberProfileUpdateRequest.create({
      member: member._id,
      memberId: member.memberId,
      memberName: member.name,
      requestedBy: req.user._id,
      nhgId: member.nhgId || req.user.nhgId || "",
      nhgName: member.nhgName || req.user.nhgName || "",
      proposedChanges,
    });

    try {
      await Notification.create({
        type: "MEMBER_PROFILE_UPDATE",
        title: "Member profile update needs review",
        message: `${member.name} (${member.memberId}) submitted profile changes. Review them in Members → Profile update requests.`,
        recipientRole: "secretary",
        recipientMemberId: "",
        targetAudience: member.nhgName || req.user.nhgName || "NHG Secretary",
        issuingAuthority: "K-Connect Member Services",
        category: "Member profile verification",
        createdBy: member.name,
        nhgId: member.nhgId || req.user.nhgId || "",
        nhgName: member.nhgName || req.user.nhgName || "",
        relatedProfileRequest: request._id,
      });
    } catch (notificationError) {
      await MemberProfileUpdateRequest.findByIdAndDelete(request._id);
      throw notificationError;
    }

    return res.status(201).json({
      message: "Your changes were sent to your NHG Secretary for verification.",
      profile: serializeMember(member),
      pendingRequest: request,
    });
  } catch (error) {
    console.error("Submit member profile update error:", error);
    return res.status(500).json({ message: "Could not send your profile changes for verification." });
  }
};

const getNHGProfileUpdateRequests = async (req, res) => {
  try {
    const nhgConditions = [];
    if (req.user.nhgId) nhgConditions.push({ nhgId: req.user.nhgId });
    if (req.user.nhgName) nhgConditions.push({ nhgName: req.user.nhgName });
    if (!nhgConditions.length) return res.json({ requests: [] });

    const requests = await MemberProfileUpdateRequest.find({
      status: "Pending",
      $or: nhgConditions,
    }).sort({ createdAt: 1 });
    return res.json({ requests });
  } catch (error) {
    console.error("Get member profile update requests error:", error);
    return res.status(500).json({ message: "Could not load profile update requests." });
  }
};

const reviewProfileUpdateRequest = async (req, res) => {
  try {
    const request = await MemberProfileUpdateRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Profile update request not found." });
    if (request.status !== "Pending") return res.status(409).json({ message: "This profile update request has already been reviewed." });

    const member = await Member.findById(request.member);
    if (!member || !ownsNHG(req.user, member)) {
      return res.status(403).json({ message: "You can review profile changes only for members of your NHG." });
    }

    const action = String(req.body.action || "").toLowerCase();
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ message: "Choose approve or reject." });
    const reviewNote = String(req.body.reviewNote || "").trim().slice(0, 500);

    if (action === "approve") {
      const changes = request.proposedChanges || {};
      const memberUpdates = {};
      for (const field of editableFields) {
        if (changes[field] && typeof changes[field].to === "string") memberUpdates[field] = changes[field].to;
      }

      if (memberUpdates.email) {
        const duplicateAccount = await User.findOne({ email: memberUpdates.email.toLowerCase(), _id: { $ne: request.requestedBy } });
        if (duplicateAccount) return res.status(409).json({ message: "This email is now linked to another account. Ask the member to submit a different email." });
      }

      Object.assign(member, memberUpdates);
      await member.save();

      const memberAccount = await User.findById(request.requestedBy);
      if (memberAccount) {
        for (const field of ["name", "phone", "email"]) {
          if (memberUpdates[field] !== undefined) memberAccount[field] = memberUpdates[field];
        }
        await memberAccount.save();
      }
      request.status = "Approved";
      request.reviewNote = reviewNote;
    } else {
      request.status = "Rejected";
      request.reviewNote = reviewNote || "Please contact your NHG Secretary for details.";
    }

    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    await Notification.updateMany(
      { relatedProfileRequest: request._id, recipientRole: { $in: ["secretary", "nhg_secretary"] } },
      { $set: { isRead: true } }
    );
    await Notification.create({
      type: "MEMBER_PROFILE_UPDATE",
      title: action === "approve" ? "Profile update approved" : "Profile update needs changes",
      message: action === "approve"
        ? "Your NHG Secretary approved your profile changes. Your profile has been updated."
        : `Your NHG Secretary could not approve the profile changes.${request.reviewNote ? ` Note: ${request.reviewNote}` : ""}`,
      recipientRole: "member",
      recipientMemberId: member.memberId,
      targetAudience: member.name,
      issuingAuthority: req.user.name || "NHG Secretary",
      category: "Member profile verification",
      createdBy: req.user.name || "NHG Secretary",
      nhgId: member.nhgId || "",
      nhgName: member.nhgName || "",
      relatedProfileRequest: request._id,
    });

    return res.json({
      message: action === "approve" ? "Profile changes approved and applied." : "Profile update declined.",
      request,
      member: serializeMember(member),
    });
  } catch (error) {
    console.error("Review member profile update request error:", error);
    return res.status(500).json({ message: "Could not review the profile update request." });
  }
};

module.exports = {
  getOwnMemberProfile,
  submitOwnProfileUpdate,
  getNHGProfileUpdateRequests,
  reviewProfileUpdateRequest,
};
