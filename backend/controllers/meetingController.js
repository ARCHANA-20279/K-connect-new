const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");
const NHG = require("../models/NHG");

// 1. Create a new Meeting
const createMeeting = async (req, res) => {
  try {
    const { title, date, time, venue, chairperson, agenda } = req.body;
    const durationMinutes = Number(req.body.durationMinutes || 60);

    if (!title || !date || !time || !venue) {
      return res.status(400).json({
        message: "Title, date, time, and venue are required fields.",
      });
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      return res.status(400).json({ message: "Meeting duration must be between 15 minutes and 8 hours." });
    }

    // Meeting numbers are globally unique in the Meeting model, so allocate
    // the next number across all NHGs (the previous per-NHG sequence could
    // collide with the database's unique meetingNumber index).
    const nhgName = req.user?.nhgName || req.body.nhgName || "Ward 15 Ayalkoottam";
    let nhgId = req.user?.nhgId || req.body.nhgId || "";

    if (!nhgId && nhgName) {
      const foundNhg = await NHG.findOne({ name: nhgName });
      if (foundNhg && foundNhg.nhgId) nhgId = foundNhg.nhgId;
    }

    const lastMeeting = await Meeting.findOne().sort({ meetingNumber: -1 });

    const meetingNumber = lastMeeting && lastMeeting.meetingNumber ? lastMeeting.meetingNumber + 1 : 1;

    const meeting = await Meeting.create({
      meetingNumber,
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      durationMinutes,
      venue: venue.trim(),
      chairperson: chairperson ? chairperson.trim() : "NHG President / Secretary",
      agenda: agenda ? agenda.trim() : "Weekly thrift collection and community updates.",
      status: "Scheduled",
      minutes: "",
      nhgName,
      nhgId,
    });

    // Automatically send notification to all NHG members
    try {
      await Notification.create({
        title: `📢 Meeting Notice: ${meeting.title}`,
        message: `Dear Member, an NHG meeting has been scheduled for ${meeting.date} at ${meeting.time}. Venue: ${meeting.venue}. Agenda: ${meeting.agenda}`,
        type: "MEETING",
        recipientRole: "member",
        targetAudience: `Members of ${nhgName}`,
        nhgName,
        nhgId,
        relatedMeeting: meeting._id,
      });
    } catch (notifErr) {
      console.warn("Could not generate notification record:", notifErr);
    }

    return res.status(201).json({
      message: `Meeting #${meetingNumber} scheduled successfully & notice sent to all members!`,
      meeting,
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return res.status(500).json({
      message: "Failed to create meeting",
      error: error.message,
    });
  }
};

// 2. Get all Meetings (with multi-NHG data isolation)
const getMeetings = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = status && status !== "All" ? { status } : {};
    const user = req.user;

    if (user) {
      const role = (user.role || "").toLowerCase();
      const isMainAdmin = role === "main_admin" || role === "super_admin" || role === "superadmin";

      if (!isMainAdmin) {
        // Secretary & Member are strictly filtered by their own NHG
        const conditions = [];
        if (user.nhgId) conditions.push({ nhgId: user.nhgId });
        if (user.nhgName) conditions.push({ nhgName: user.nhgName });
        if (conditions.length > 0) {
          filter.$or = conditions;
        }
      } else {
        // Main Admin can view all or filter by query
        if (req.query.nhgId) {
          filter.$or = [{ nhgId: req.query.nhgId }, { nhgName: req.query.nhgName }];
        } else if (req.query.nhgName) {
          filter.nhgName = req.query.nhgName;
        }
      }
    }

    const meetings = await Meeting.find(filter).sort({ date: -1, meetingNumber: -1 });

    const totalMeetings = meetings.length;
    const scheduledCount = meetings.filter((m) => m.status === "Scheduled").length;
    const completedCount = meetings.filter((m) => m.status === "Completed").length;

    return res.status(200).json({
      totalMeetings,
      scheduledCount,
      completedCount,
      meetings,
    });
  } catch (error) {
    console.error("Get meetings error:", error);
    return res.status(500).json({
      message: "Failed to fetch meetings",
      error: error.message,
    });
  }
};

// 3. Get single Meeting by ID
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.status(200).json({ meeting });
  } catch (error) {
    console.error("Get meeting error:", error);
    return res.status(500).json({
      message: "Failed to fetch meeting details",
      error: error.message,
    });
  }
};

// 4. Update Meeting
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time, venue, chairperson, agenda, status } = req.body;
    const durationMinutes = Number(req.body.durationMinutes || 60);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      return res.status(400).json({ message: "Meeting duration must be between 15 minutes and 8 hours." });
    }

    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { title, date, time, venue, chairperson, agenda, status, durationMinutes },
      { new: true, runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.status(200).json({
      message: "Meeting updated successfully",
      meeting,
    });
  } catch (error) {
    console.error("Update meeting error:", error);
    return res.status(500).json({
      message: "Failed to update meeting",
      error: error.message,
    });
  }
};

// 5. Record Minutes of Meeting & Mark Completed
const recordMinutes = async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes, totalAttendees } = req.body;

    if (!minutes || !minutes.trim()) {
      return res.status(400).json({ message: "Meeting minutes and resolution notes are required." });
    }

    const meeting = await Meeting.findByIdAndUpdate(
      id,
      {
        minutes: minutes.trim(),
        minutesDraft: "",
        totalAttendees: totalAttendees ? Number(totalAttendees) : 0,
        status: "Completed",
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.status(200).json({
      message: `Minutes recorded for Meeting #${meeting.meetingNumber}. Status updated to Completed!`,
      meeting,
    });
  } catch (error) {
    console.error("Record minutes error:", error);
    return res.status(500).json({
      message: "Failed to record minutes",
      error: error.message,
    });
  }
};

const saveMinutesDraft = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found." });
    const user = req.user;
    const sameNhg = Boolean(
      (user?.nhgId && meeting.nhgId === user.nhgId) ||
      (user?.nhgName && meeting.nhgName === user.nhgName)
    );
    if (!sameNhg) return res.status(403).json({ message: "You can only save minutes for your assigned NHG." });
    if (meeting.status !== "Scheduled") return res.status(400).json({ message: "Minutes can only be autosaved while the meeting is in progress." });

    meeting.minutesDraft = String(req.body.minutesDraft || "").trim();
    if (req.body.totalAttendees !== undefined && req.body.totalAttendees !== "") {
      const attendees = Number(req.body.totalAttendees);
      if (!Number.isInteger(attendees) || attendees < 0) return res.status(400).json({ message: "Enter a valid attendance count." });
      meeting.totalAttendees = attendees;
    }
    await meeting.save();
    return res.status(200).json({ message: "Minute book draft saved.", meeting });
  } catch (error) {
    console.error("Save minutes draft error:", error);
    return res.status(500).json({ message: "Could not autosave minute book draft.", error: error.message });
  }
};

// 6. Delete / Cancel Meeting
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findByIdAndDelete(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.status(200).json({
      message: `Meeting #${meeting.meetingNumber} deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return res.status(500).json({
      message: "Failed to delete meeting",
      error: error.message,
    });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  recordMinutes,
  saveMinutesDraft,
  deleteMeeting,
};
