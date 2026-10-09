const Attendance = require("../models/Attendance");
const Member = require("../models/Member");
const Meeting = require("../models/Meeting");
const { calculateCreditScore } = require("../services/creditScoreService");
const { randomBytes } = require("crypto");

// A 128-bit one-time meeting secret keeps the QR compact while remaining unpredictable.
const createAttendanceToken = () => randomBytes(16).toString("hex");

// ==========================================
// 1. MEMBER SCANS MEETING QR CODE (NEW WORKFLOW)
// ==========================================
const scanMeetingAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: "Authentication required to mark attendance.",
      });
    }
    const role = String(user.role || "").toLowerCase().replace(/[-_\s]/g, "");
    const hasMemberRole = ["member", "nhgmember"].includes(role);

    // 1. Identify member from req.user (Logged-in member identity)
    let member = null;
    if (user.memberId) {
      member = await Member.findOne({ memberId: user.memberId });
      if (member?.email && user.email && member.email.toLowerCase() !== user.email.toLowerCase()) member = null;
    }
    if (!member && user.email) {
      member = await Member.findOne({ email: user.email.toLowerCase() });
    }

    // Some existing accounts have a legacy/incorrect role value. Trust a
    // non-member role only when this exact login email is linked to an active
    // NHG member record; never infer membership from a matching name alone.
    if (!hasMemberRole && (!member || member.status !== "Active" || !user.email || member.email?.toLowerCase() !== user.email.toLowerCase())) {
      return res.status(403).json({
        message: "This login is not linked to an active Member profile. Sign in with the Member account registered under that member’s email.",
      });
    }

    if (!member && hasMemberRole && user.name) {
      member = await Member.findOne({
        name: { $regex: new RegExp(`^${user.name}$`, "i") },
      });
    }

    if (!member) {
      if (hasMemberRole && user.memberId) {
        member = {
          memberId: user.memberId,
          name: user.name,
          ward: user.nhgName || "Ward 15",
          phone: user.phone || "-",
          status: "Active",
        };
      } else {
        return res.status(404).json({
          message: "Kudumbashree member profile not found for logged-in user.",
        });
      }
    }

    // Check whether member is active
    if (member.status !== "Active") {
      return res.status(400).json({
        message: "Your member profile is not active yet. Please ask the Secretary to approve it before scanning.",
      });
    }

    // 2. Extract meetingId and token from request
    let meetingId = req.body.meetingId;
    let token = req.body.token;
    const qrData = req.body.qrData;

    if (qrData) {
      if (typeof qrData === "object") {
        meetingId = qrData.meetingId || meetingId;
        token = qrData.token || token;
      } else if (typeof qrData === "string") {
        const trimmed = qrData.trim();
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.meetingId) meetingId = parsed.meetingId;
          if (parsed.token) token = parsed.token;
        } catch (e) {
          if (trimmed.startsWith("KCMTG:")) {
            const parts = trimmed.split(":");
            meetingId = parts[1];
            token = parts[2];
          } else if (trimmed.match(/^[0-9a-fA-F]{24}$/)) {
            meetingId = trimmed;
          }
        }
      }
    }

    if (!meetingId) {
      return res.status(400).json({
        message: "Invalid QR code: Missing meeting information.",
      });
    }

    // 3. Find the meeting and validate
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found or has been removed.",
      });
    }

    // Check meeting status: must be active ("Scheduled")
    if (meeting.status !== "Scheduled") {
      return res.status(400).json({
        message: `Meeting attendance is closed. This meeting is ${meeting.status.toLowerCase()}.`,
        meeting,
      });
    }

    const memberNhgId = (member.nhgId || "").trim().toLowerCase();
    const meetingNhgId = (meeting.nhgId || "").trim().toLowerCase();
    const memberNhgName = (member.nhgName || "").trim().toLowerCase();
    const meetingNhgName = (meeting.nhgName || "").trim().toLowerCase();
    if (
      (memberNhgId && meetingNhgId && memberNhgId !== meetingNhgId) ||
      (memberNhgName && meetingNhgName && (!memberNhgId || !meetingNhgId) && memberNhgName !== meetingNhgName)
    ) {
      return res.status(403).json({
        message: "This QR code belongs to a different NHG.",
        meeting,
      });
    }

    // A QR code must contain the meeting's current secret token.
    if (!meeting.attendanceToken || !token || meeting.attendanceToken !== token) {
      return res.status(400).json({
        message: "Invalid or expired Meeting QR code token.",
      });
    }

    // 4. Duplicate check: If member already marked for this meeting
    const existingAttendance = await Attendance.findOne({
      memberId: member.memberId,
      meetingId: meeting._id,
    });

    if (existingAttendance) {
      return res.status(400).json({
        alreadyMarked: true,
        message: "Attendance already marked for this meeting.",
        meeting,
        member,
        attendance: existingAttendance,
      });
    }

    // 5. Create new Attendance record
    const attendance = await Attendance.create({
      memberId: member.memberId,
      meetingId: meeting._id,
      date: new Date(),
      status: "Present",
      nhgId: meeting.nhgId || member.nhgId || user.nhgId || "",
      nhgName: meeting.nhgName || member.nhgName || user.nhgName || "",
    });
    await calculateCreditScore(member.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));

    // 6. Update meeting attendee count
    const totalAttendees = await Attendance.countDocuments({
      meetingId: meeting._id,
      status: "Present",
    });
    meeting.totalAttendees = totalAttendees;
    await meeting.save();

    return res.status(201).json({
      alreadyMarked: false,
      message: `Attendance recorded successfully for ${meeting.title}!`,
      meeting,
      member,
      attendance,
    });
  } catch (error) {
    console.error("Scan meeting attendance error:", error);
    return res.status(500).json({
      message: "Failed to record meeting attendance",
      error: error.message,
    });
  }
};

// ==========================================
// 2. GET ATTENDANCE & QR CODE FOR A MEETING
// ==========================================
const getMeetingAttendance = async (req, res) => {
  try {
    const { meetingId } = req.params;

    let meeting = null;
    if (meetingId && meetingId !== "latest") {
      meeting = await Meeting.findById(meetingId);
    } else {
      // Find latest scheduled meeting, or latest created meeting
      meeting = await Meeting.findOne({ status: "Scheduled" }).sort({ date: -1, meetingNumber: -1 });
      if (!meeting) {
        meeting = await Meeting.findOne().sort({ date: -1, meetingNumber: -1 });
      }
    }

    if (!meeting) {
      return res.status(404).json({
        message: "No meeting found.",
      });
    }

    const role = (req.user?.role || "").toLowerCase().replace(/[-_]/g, "");
    const isPlatformAdmin = ["mainadmin", "superadmin"].includes(role);
    const isSecretary = ["secretary", "nhgsecretary"].includes(role);
    const requestNhgId = (req.user?.nhgId || "").trim().toLowerCase();
    const meetingNhgId = (meeting.nhgId || "").trim().toLowerCase();
    const requestNhgName = (req.user?.nhgName || "").trim().toLowerCase();
    const meetingNhgName = (meeting.nhgName || "").trim().toLowerCase();
    const differentNhg =
      (requestNhgId && meetingNhgId && requestNhgId !== meetingNhgId) ||
      (requestNhgName && meetingNhgName && (!requestNhgId || !meetingNhgId) && requestNhgName !== meetingNhgName);
    if (!isPlatformAdmin && differentNhg) {
      return res.status(403).json({ message: "This meeting belongs to a different NHG." });
    }

    // Ensure the meeting has a compact token; rotate longer legacy tokens to
    // keep the QR easy to decode on phone cameras.
    if (!/^[a-f0-9]{32}$/i.test(meeting.attendanceToken || "")) {
      meeting.attendanceToken = createAttendanceToken();
      await meeting.save();
    }

    // Keep the QR payload compact so phone cameras can decode it reliably.
    // The scanner accepts this KCMTG:<meetingId>:<token> format.
    const qrPayload = `KCMTG:${meeting._id.toString()}:${meeting.attendanceToken}`;

    // Get all active members belonging to this meeting's NHG
    const memberFilter = { status: "Active" };
    const rosterNhgId = meeting.nhgId || req.user?.nhgId;
    const rosterNhgName = meeting.nhgName || req.user?.nhgName;
    if (rosterNhgId) {
      const fallback = rosterNhgName
        ? [{ nhgId: { $in: [null, ""] }, nhgName: rosterNhgName }]
        : [];
      memberFilter.$or = [{ nhgId: rosterNhgId }, ...fallback];
    } else if (rosterNhgName) {
      memberFilter.nhgName = rosterNhgName;
    }
    const activeMembers = await Member.find(memberFilter).sort({ name: 1 });

    // Get attendance records for this meeting
    const activeMemberIds = new Set(activeMembers.map((member) => member.memberId));
    const attendanceRecords = (await Attendance.find({
      meetingId: meeting._id,
      status: "Present",
    }).sort({ date: -1 })).filter((record) => activeMemberIds.has(record.memberId));

    const presentMemberIds = new Set(attendanceRecords.map((r) => r.memberId));

    const absentMembers = activeMembers.filter(
      (m) => !presentMemberIds.has(m.memberId)
    );

    const presentRecords = attendanceRecords.map((record) => {
      const member = activeMembers.find((m) => m.memberId === record.memberId);
      return {
        _id: record._id,
        memberId: record.memberId,
        name: member ? member.name : "Member " + record.memberId,
        ward: member ? member.ward : "Ward 15",
        phone: member ? member.phone : "-",
        time: new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        markedVia: "MEETING_QR",
      };
    }).sort((first, second) => first.name.localeCompare(second.name));

    const meetingResponse = meeting.toObject();
    if (!isSecretary && !isPlatformAdmin) delete meetingResponse.attendanceToken;

    return res.status(200).json({
      meeting: meetingResponse,
      qrData: isSecretary || isPlatformAdmin ? qrPayload : null,
      totalMembers: activeMembers.length,
      presentCount: presentRecords.length,
      absentCount: absentMembers.length,
      presentRecords,
      absentMembers,
    });
  } catch (error) {
    console.error("Get meeting attendance error:", error);
    return res.status(500).json({
      message: "Failed to fetch meeting attendance",
      error: error.message,
    });
  }
};

// ==========================================
// 3. REGENERATE MEETING ATTENDANCE TOKEN
// ==========================================
const generateMeetingToken = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const role = (req.user?.role || "").toLowerCase().replace(/[-_]/g, "");
    const isPlatformAdmin = ["mainadmin", "superadmin"].includes(role);
    const userNhgId = (req.user?.nhgId || "").trim().toLowerCase();
    const meetingNhgId = (meeting.nhgId || "").trim().toLowerCase();
    const userNhgName = (req.user?.nhgName || "").trim().toLowerCase();
    const meetingNhgName = (meeting.nhgName || "").trim().toLowerCase();
    const differentNhg =
      (userNhgId && meetingNhgId && userNhgId !== meetingNhgId) ||
      (userNhgName && meetingNhgName && (!userNhgId || !meetingNhgId) && userNhgName !== meetingNhgName);
    if (!isPlatformAdmin && differentNhg) {
      return res.status(403).json({ message: "You can only generate a QR code for your own NHG meetings." });
    }

    meeting.attendanceToken = createAttendanceToken();
    await meeting.save();

    const qrPayload = {
      type: "K_CONNECT_MEETING_QR",
      meetingId: meeting._id.toString(),
      token: meeting.attendanceToken,
      meetingNumber: meeting.meetingNumber,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
    };

    return res.status(200).json({
      message: "Meeting attendance QR token refreshed successfully.",
      meeting,
      qrData: JSON.stringify(qrPayload),
    });
  } catch (error) {
    console.error("Generate meeting token error:", error);
    return res.status(500).json({
      message: "Failed to generate meeting token",
      error: error.message,
    });
  }
};

// ==========================================
// 4. LEGACY / FALLBACK SCAN (MEMBER ID SCAN)
// ==========================================
const scanAttendance = async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        message: "Member ID is required",
      });
    }

    const trimmedMemberId = memberId.trim();

    const member = await Member.findOne({
      memberId: trimmedMemberId,
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (member.status === "Inactive") {
      return res.status(400).json({
        message: "This member is inactive",
        member,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      memberId: trimmedMemberId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (existingAttendance) {
      return res.status(200).json({
        alreadyMarked: true,
        message: `${member.name}'s attendance is already marked today`,
        member,
        attendance: existingAttendance,
      });
    }

    const attendance = await Attendance.create({
      memberId: trimmedMemberId,
      date: new Date(),
      status: "Present",
    });
    await calculateCreditScore(member.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));

    res.status(201).json({
      alreadyMarked: false,
      message: `${member.name}'s attendance recorded successfully`,
      member,
      attendance,
    });
  } catch (error) {
    console.error("Scan attendance error:", error);
    res.status(500).json({
      message: "Failed to record attendance",
    });
  }
};

// ==========================================
// 5. GET TODAY'S GENERAL ATTENDANCE
// ==========================================
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const user = req.user;
    const rawRole = (user?.role || "").toLowerCase();
    const isMainAdmin = rawRole === "main_admin" || rawRole === "super_admin" || rawRole === "superadmin";

    let attFilter = {
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      status: "Present",
    };

    let memberFilter = { status: "Active" };

    if (!isMainAdmin && user) {
      const conditions = [];
      if (user.nhgId) conditions.push({ nhgId: user.nhgId });
      if (user.nhgName) conditions.push({ nhgName: user.nhgName });
      if (conditions.length > 0) {
        attFilter.$or = conditions;
        memberFilter.$or = conditions;
      }
    }

    const attendanceRecords = await Attendance.find(attFilter).sort({ date: -1 });

    const activeMembers = await Member.find(memberFilter).sort({ name: 1 });

    const presentIds = new Set(
      attendanceRecords.map((record) => record.memberId)
    );

    const absentMembers = activeMembers.filter(
      (member) => !presentIds.has(member.memberId)
    );

    const presentRecords = attendanceRecords.map((record) => {
      const member = activeMembers.find(
        (item) => item.memberId === record.memberId
      );

      return {
        _id: record._id,
        memberId: record.memberId,
        name: member ? member.name : "Unknown Member",
        ward: member ? member.ward : "-",
        phone: member ? member.phone : "-",
        time: new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        markedVia: record.meetingId ? "MEETING_QR" : "QR_KIOSK",
      };
    });

    res.status(200).json({
      date: today.toISOString().split("T")[0],
      totalMembers: activeMembers.length,
      presentCount: presentRecords.length,
      absentCount: absentMembers.length,
      presentRecords,
      absentMembers,
    });
  } catch (error) {
    console.error("Get today's attendance error:", error);
    res.status(500).json({
      message: "Failed to fetch today's attendance",
    });
  }
};

// ==========================================
// 6. MANUAL MARK ATTENDANCE (SECRETARY ACTION)
// ==========================================
const manualMarkAttendance = async (req, res) => {
  try {
    const { memberId, meetingId, status } = req.body;

    if (!memberId) {
      return res.status(400).json({
        message: "Member ID is required",
      });
    }

    const member = await Member.findOne({ memberId });

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (member.status === "Inactive") {
      return res.status(400).json({
        message: "This member is inactive",
      });
    }

    // If marked for a specific meeting
    if (meetingId) {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      const existing = await Attendance.findOne({
        memberId,
        meetingId: meeting._id,
      });

      if (existing) {
        return res.status(400).json({
          message: "Attendance already marked for this meeting.",
        });
      }

      const attendance = await Attendance.create({
        memberId,
        meetingId: meeting._id,
        date: new Date(),
        status: status || "Present",
      });
      await calculateCreditScore(member.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));

      const totalAttendees = await Attendance.countDocuments({
        meetingId: meeting._id,
        status: "Present",
      });
      meeting.totalAttendees = totalAttendees;
      await meeting.save();

      return res.status(201).json({
        message: `${member.name}'s attendance marked manually for ${meeting.title}`,
        member,
        meeting,
        attendance,
      });
    }

    // Otherwise fallback to today-based manual mark
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      memberId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: `${member.name}'s attendance is already marked today`,
      });
    }

    const attendance = await Attendance.create({
      memberId,
      date: new Date(),
      status: status || "Present",
    });
    await calculateCreditScore(member.memberId).catch((scoreError) => console.warn("Could not refresh member credit score:", scoreError.message));

    res.status(201).json({
      message: `${member.name}'s attendance marked manually`,
      member,
      attendance,
    });
  } catch (error) {
    console.error("Manual attendance error:", error);
    res.status(500).json({
      message: "Failed to mark attendance",
    });
  }
};

// ==========================================
// 7. GET ATTENDANCE HISTORY
// ==========================================
const getAttendanceHistory = async (req, res) => {
  try {
    let filter = {};
    const user = req.user;
    if (user) {
      const rawRole = (user.role || "").toLowerCase();
      const isMainAdmin = rawRole === "main_admin" || rawRole === "super_admin" || rawRole === "superadmin";
      if (!isMainAdmin) {
        const conditions = [];
        if (user.nhgId) conditions.push({ nhgId: user.nhgId });
        if (user.nhgName) conditions.push({ nhgName: user.nhgName });
        if (conditions.length > 0) filter.$or = conditions;
      } else {
        if (req.query.nhgId) filter.nhgId = req.query.nhgId;
        else if (req.query.nhgName) filter.nhgName = req.query.nhgName;
      }
    }

    const records = await Attendance.find(filter).sort({
      date: -1,
    });

    res.status(200).json({
      records,
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    res.status(500).json({
      message: "Failed to fetch attendance history",
    });
  }
};

// ==========================================
// 8. RESET ATTENDANCE (DEMO / SECRETARY UTILITY)
// ==========================================
const clearTodayAttendance = async (req, res) => {
  try {
    const meetingId = req.query.meetingId || req.body?.meetingId;
    if (meetingId) {
      const result = await Attendance.deleteMany({ meetingId });
      await Meeting.findByIdAndUpdate(meetingId, { totalAttendees: 0 });
      return res.status(200).json({
        message: `Meeting attendance cleared. ${result.deletedCount} record(s) removed.`,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await Attendance.deleteMany({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    res.status(200).json({
      message: `Today's attendance cleared. ${result.deletedCount} record(s) removed.`,
    });
  } catch (error) {
    console.error("Clear attendance error:", error);
    res.status(500).json({
      message: "Failed to reset today's attendance",
    });
  }
};

module.exports = {
  scanMeetingAttendance,
  getMeetingAttendance,
  generateMeetingToken,
  scanAttendance,
  getTodayAttendance,
  manualMarkAttendance,
  getAttendanceHistory,
  clearTodayAttendance,
};
