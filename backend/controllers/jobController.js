const JobAllocation = require("../models/JobAllocation");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const { randomUUID } = require("crypto");

const roleOf = (user) => (user?.role || "").toLowerCase();
const isSecretary = (user) => ["secretary", "nhg_secretary"].includes(roleOf(user));
const sameNhg = (user, member) => Boolean(
  (user?.nhgId && member?.nhgId === user.nhgId) ||
  (user?.nhgName && member?.nhgName === user.nhgName)
);
const sameJobNhg = (user, job) => Boolean(
  (user?.nhgId && job?.nhgId === user.nhgId) ||
  (user?.nhgName && job?.nhgName === user.nhgName)
);
const secretaryOwnsJob = async (user, job) => {
  if (sameJobNhg(user, job)) return true;
  const assignedMember = await Member.findOne({ memberId: job.assignedMemberId }).select("nhgId nhgName");
  return sameNhg(user, assignedMember);
};
const notify = async ({ title, message, role, memberId, nhgId, nhgName, jobId }) => {
  await Notification.create({
    title,
    message,
    type: "JOB",
    recipientRole: role,
    recipientMemberId: memberId || "",
    targetAudience: memberId ? `Member ${memberId}` : `Secretary of ${nhgName || "NHG"}`,
    createdBy: "K-Connect Jobs",
    nhgId: nhgId || "",
    nhgName: nhgName || "",
    relatedJob: jobId,
  });
};

const createJob = async (req, res) => {
  try {
    const projectName = req.body.projectName || req.body.taskName;
    const { category } = req.body;
    const submittedTasks = Array.isArray(req.body.tasks) ? req.body.tasks : [{
      taskName: req.body.taskName,
      assignedMemberId: req.body.assignedMemberId,
      deadline: req.body.deadline,
      stipendAmount: req.body.stipendAmount,
      description: req.body.description,
    }];
    if (!projectName?.trim() || !submittedTasks.length || submittedTasks.some((task) => !task.taskName?.trim() || !task.assignedMemberId || !task.deadline)) {
      return res.status(400).json({ message: "Project name, each task, assignee, and deadline are required." });
    }
    const nhgScope = [
      ...(req.user.nhgId ? [{ nhgId: req.user.nhgId }] : []),
      ...(req.user.nhgName ? [{ nhgName: req.user.nhgName }] : []),
    ];
    if (!nhgScope.length) return res.status(403).json({ message: "Your Secretary account is not linked to an NHG." });
    const memberIds = [...new Set(submittedTasks.map((task) => task.assignedMemberId))];
    const members = await Member.find({ status: "Active", memberId: { $in: memberIds }, $or: nhgScope }).select("memberId name nhgId nhgName");
    const membersById = new Map(members.map((member) => [member.memberId, member]));
    if (members.length !== memberIds.length || members.some((member) => !sameNhg(req.user, member))) {
      return res.status(400).json({ message: "Every task must be assigned to an active member of your NHG." });
    }
    for (const task of submittedTasks) {
      const amount = Number(task.stipendAmount || 0);
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: "Enter a valid payment amount for each task." });
    }
    const groupId = randomUUID();
    const jobs = await JobAllocation.insertMany(submittedTasks.map((task) => {
      const member = membersById.get(task.assignedMemberId);
      return {
        projectName: projectName.trim(), taskName: task.taskName.trim(), category,
        assignedMemberId: member.memberId, assignedMemberName: member.name,
        deadline: task.deadline, stipendAmount: Number(task.stipendAmount) || 0,
        description: (task.description || "").trim(), status: "Assigned",
        assignedBy: req.user.name || "Secretary", nhgId: member.nhgId || req.user.nhgId || "",
        nhgName: member.nhgName || req.user.nhgName || "", assignmentGroupId: groupId,
      };
    }));
    await Promise.all(jobs.map((job) => notify({
      title: `New task for ${job.projectName}: ${job.taskName}`,
      message: `${req.user.name || "Your Secretary"} assigned you “${job.taskName}” for ${job.projectName}. Please review it and mark interested, decline with a reason, or update it when complete.`,
      role: "member", memberId: job.assignedMemberId, nhgId: job.nhgId, nhgName: job.nhgName, jobId: job._id,
    })));
    res.status(201).json({ message: `${jobs.length} task${jobs.length === 1 ? "" : "s"} created for ${projectName}.`, jobs, job: jobs[0] });
  } catch (err) {
    console.error("Create job error:", err);
    res.status(500).json({ message: "Failed to allocate job", error: err.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const filter = {};
    if (roleOf(req.user) === "member") filter.assignedMemberId = req.user.memberId;
    else if (isSecretary(req.user)) {
      const nhgScope = [
        ...(req.user.nhgId ? [{ nhgId: req.user.nhgId }] : []),
        ...(req.user.nhgName ? [{ nhgName: req.user.nhgName }] : []),
      ];
      const memberFilter = { status: "Active", $or: nhgScope };
      const nhgMembers = nhgScope.length ? await Member.find(memberFilter).select("memberId") : [];
      filter.$or = [...nhgScope, { assignedMemberId: { $in: nhgMembers.map((member) => member.memberId) } }];
    }
    const jobs = await JobAllocation.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ jobs, totalJobs: jobs.length, completedCount: jobs.filter((j) => j.status === "Completed").length, inProgressCount: jobs.filter((j) => ["Interested", "In Progress", "Assigned"].includes(j.status)).length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch jobs", error: err.message });
  }
};

const respondToJob = async (req, res) => {
  try {
    const job = await JobAllocation.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    if (roleOf(req.user) !== "member" || job.assignedMemberId !== req.user.memberId) return res.status(403).json({ message: "You can update only jobs assigned to you." });
    const { action, reason } = req.body;
    if (action === "not_interested") {
      if (!reason?.trim() || reason.trim().length < 5) return res.status(400).json({ message: "Please give a clear reason (at least 5 characters)." });
      job.status = "Not Interested";
      job.declineReason = reason.trim();
      await job.save();
      await notify({ title: `Member declined job: ${job.taskName}`, message: `${job.assignedMemberName} is not interested in “${job.taskName}” for ${job.projectName || "the project"}. Reason: ${job.declineReason}`, role: "secretary", nhgId: job.nhgId, nhgName: job.nhgName, jobId: job._id });
    } else if (action === "interested") {
      if (!["Assigned", "Interested"].includes(job.status)) return res.status(400).json({ message: "This job is no longer awaiting a response." });
      job.status = "Interested";
      await job.save();
    } else if (action === "start") {
      if (!["Assigned", "Interested", "In Progress"].includes(job.status)) return res.status(400).json({ message: "This job cannot be started in its current state." });
      job.status = "In Progress";
      await job.save();
    } else if (action === "complete") {
      if (job.status !== "In Progress") return res.status(400).json({ message: "Start the accepted job before marking it complete." });
      job.status = "Completed";
      job.completedAt = new Date();
      await job.save();
      await notify({ title: `Job marked complete: ${job.taskName}`, message: `${job.assignedMemberName} marked “${job.taskName}” complete.`, role: "secretary", nhgId: job.nhgId, nhgName: job.nhgName, jobId: job._id });
    } else return res.status(400).json({ message: "Choose a valid job response." });
    res.json({ message: "Job updated.", job });
  } catch (err) {
    res.status(500).json({ message: "Failed to update job", error: err.message });
  }
};

const reassignJob = async (req, res) => {
  try {
    const job = await JobAllocation.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    if (!isSecretary(req.user) || !(await secretaryOwnsJob(req.user, job))) return res.status(403).json({ message: "Only this NHG Secretary can reassign the job." });
    if (job.status !== "Not Interested") return res.status(400).json({ message: "A job can be reassigned after the member declines it." });
    const member = await Member.findOne({ memberId: req.body.assignedMemberId, status: "Active" });
    if (!member || !sameNhg(req.user, member)) return res.status(404).json({ message: "Choose an active member of your NHG." });
    job.assignedMemberId = member.memberId;
    job.assignedMemberName = member.name;
    job.status = "Assigned";
    job.declineReason = "";
    job.assignedBy = req.user.name || "Secretary";
    job.reassignedAt = new Date();
    await job.save();
    await notify({ title: `Job reassigned to you: ${job.taskName}`, message: `${req.user.name || "Your Secretary"} assigned you “${job.taskName}” for ${job.projectName || "the project"}. Please review it and respond on the Community Jobs page.`, role: "member", memberId: member.memberId, nhgId: job.nhgId, nhgName: job.nhgName, jobId: job._id });
    res.json({ message: `Job reassigned to ${member.name}.`, job });
  } catch (err) {
    res.status(500).json({ message: "Failed to reassign job", error: err.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await JobAllocation.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    if (!isSecretary(req.user) || !(await secretaryOwnsJob(req.user, job))) return res.status(403).json({ message: "Only this NHG Secretary can delete the job." });
    await job.deleteOne();
    res.json({ message: "Task deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task", error: err.message });
  }
};

module.exports = { createJob, getJobs, respondToJob, reassignJob, deleteJob };
