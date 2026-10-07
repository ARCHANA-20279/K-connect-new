import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./MeetingManagement.css";

const getMeetingEndDate = (meeting) => {
  if (!meeting?.date || !meeting?.time) return null;
  const match = meeting.time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0)) return null;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const endDate = new Date(`${meeting.date}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) return null;
  endDate.setMinutes(hours * 60 + minutes + (Number(meeting.durationMinutes) || 60));
  return endDate;
};

const MeetingManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase().replace(/-/g, "_");
  const isSecretary = ["secretary", "nhg_secretary"].includes(role);
  const isMember = role === "member";
  const isMalayalam = i18n.resolvedLanguage === "ml" || i18n.language === "ml";

  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    scheduledCount: 0,
    completedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All"); // 'All' | 'Scheduled' | 'Completed'
  const [clockTick, setClockTick] = useState(Date.now());
  const [speechStatus, setSpeechStatus] = useState("idle");
  const [speechError, setSpeechError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [draftSaveStatus, setDraftSaveStatus] = useState("saved");
  const speechRecognitionRef = useRef(null);
  const minutesRef = useRef("");

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    date: "",
    time: "",
    durationMinutes: 60,
    venue: "",
    chairperson: "",
    agenda: "",
  });

  const [minutesForm, setMinutesForm] = useState({
    minutes: "",
    totalAttendees: "",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    time: "",
    durationMinutes: 60,
    venue: "",
    chairperson: "",
    agenda: "",
    status: "Scheduled",
  });

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/meetings");
      setMeetings(res.data.meetings || []);
      setStats({
        totalMeetings: res.data.totalMeetings || 0,
        scheduledCount: res.data.scheduledCount || 0,
        completedCount: res.data.completedCount || 0,
      });
    } catch (err) {
      console.error("Failed to load meetings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Broadcast modal state
  const [newlyScheduledMeeting, setNewlyScheduledMeeting] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // WhatsApp Broadcast Helper
  const shareMeetingToWhatsApp = (meeting) => {
    const text =
      `📢 *Kudumbashree NHG Meeting Notice*\n\n` +
      `📌 *Meeting:* #${meeting.meetingNumber} - ${meeting.title}\n` +
      `📅 *Date:* ${meeting.date}\n` +
      `⏰ *Time:* ${meeting.time}\n` +
      `📍 *Venue:* ${meeting.venue}\n` +
      `👤 *Chairperson:* ${meeting.chairperson}\n` +
      `📝 *Agenda:* ${meeting.agenda || "General NHG Discussion"}\n\n` +
      `_All NHG Members are requested to attend promptly. Sent via K-Connect._`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Handle Schedule Form Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/meetings", scheduleForm);
      setShowScheduleModal(false);
      setScheduleForm({
        title: "",
        date: "",
        time: "",
        durationMinutes: 60,
        venue: "",
        chairperson: "",
        agenda: "",
      });
      fetchMeetings();
      // Show notification & WhatsApp broadcast modal
      setNewlyScheduledMeeting(res.data.meeting);
      setShowBroadcastModal(true);
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      const serverDetail = err.response?.data?.error;
      alert([serverMessage || "Failed to schedule meeting", serverDetail].filter(Boolean).join(": "));
    }
  };

  // Open Record Minutes Modal
  const openMinutesModal = (meeting) => {
    setSelectedMeeting(meeting);
    setMinutesForm({
      minutes: meeting.minutesDraft || meeting.minutes || "",
      totalAttendees: meeting.totalAttendees || "",
    });
    minutesRef.current = meeting.minutesDraft || meeting.minutes || "";
    setDraftSaveStatus("saved");
    setSpeechStatus("idle");
    setInterimTranscript("");
    setShowMinutesModal(true);
  };

  const closeMinutesModal = () => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setSpeechStatus("idle");
    setInterimTranscript("");
    setShowMinutesModal(false);
  };

  // Handle Record Minutes Submit
  const handleMinutesSubmit = async (e) => {
    e.preventDefault();
    try {
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
      await api.patch(`/meetings/${selectedMeeting._id}/minutes`, minutesForm);
      setShowMinutesModal(false);
      fetchMeetings();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record minutes");
    }
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("unsupported");
      setSpeechStatus("unsupported");
      return;
    }
    try {
      setSpeechError("");
      const recognition = new SpeechRecognition();
      recognition.lang = isMalayalam ? "ml-IN" : "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      let processedFinalResults = 0;
      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let index = processedFinalResults; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript?.trim();
          if (!text) continue;
          if (result.isFinal) {
            finalText += `${text} `;
            processedFinalResults = index + 1;
          } else {
            interimText += `${text} `;
          }
        }
        setInterimTranscript(interimText.trim());
        if (finalText.trim()) {
          setMinutesForm((previous) => {
            const combined = [previous.minutes.trim(), finalText.trim()].filter(Boolean).join(" ");
            minutesRef.current = combined;
            return { ...previous, minutes: combined };
          });
        }
      };
      recognition.onerror = (event) => {
        setSpeechError(event.error || "unknown");
        setSpeechStatus(event.error === "not-allowed" ? "permission" : "error");
      };
      recognition.onend = () => {
        setSpeechStatus((status) => status === "listening" ? "stopped" : status);
        setInterimTranscript("");
      };
      speechRecognitionRef.current = recognition;
      recognition.start();
      setSpeechStatus("listening");
    } catch (error) {
      setSpeechError(error?.name || "start-failed");
      setSpeechStatus("error");
    }
  };

  const stopVoiceCapture = () => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setSpeechStatus("stopped");
  };

  useEffect(() => {
    if (!isSecretary || showMinutesModal) return;
    const now = new Date(clockTick);
    const endingMeeting = meetings.find((meeting) => {
      if (meeting.status !== "Scheduled" || meeting.minutes) return false;
      const endTime = getMeetingEndDate(meeting);
      if (!endTime) return false;
      const minutesUntilEnd = (endTime.getTime() - now.getTime()) / 60000;
      return minutesUntilEnd <= 15 && minutesUntilEnd >= -60;
    });
    if (!endingMeeting) return;
    const promptKey = `kconnect-minute-book-prompted-${user?._id || user?.email}-${endingMeeting._id}`;
    if (sessionStorage.getItem(promptKey)) return;
    sessionStorage.setItem(promptKey, "1");
    openMinutesModal(endingMeeting);
  }, [clockTick, isSecretary, meetings, showMinutesModal, user?._id, user?.email]);

  useEffect(() => {
    minutesRef.current = minutesForm.minutes;
  }, [minutesForm.minutes]);

  useEffect(() => {
    if (!isSecretary || !showMinutesModal || !selectedMeeting || selectedMeeting.status !== "Scheduled") return undefined;
    const minutesText = minutesForm.minutes.trim();
    const attendeesText = String(minutesForm.totalAttendees || "");
    if (minutesText === String(selectedMeeting.minutesDraft || "").trim() && attendeesText === String(selectedMeeting.totalAttendees || "")) {
      setDraftSaveStatus("saved");
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setDraftSaveStatus("saving");
      try {
        const { data } = await api.patch(`/meetings/${selectedMeeting._id}/minutes/draft`, {
          minutesDraft: minutesText,
          totalAttendees: attendeesText,
        });
        const updatedMeeting = data.meeting;
        setSelectedMeeting((current) => current?._id === updatedMeeting._id ? updatedMeeting : current);
        setMeetings((current) => current.map((meeting) => meeting._id === updatedMeeting._id ? updatedMeeting : meeting));
        setDraftSaveStatus("saved");
      } catch (error) {
        setDraftSaveStatus("error");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isSecretary, minutesForm.minutes, minutesForm.totalAttendees, selectedMeeting, showMinutesModal]);

  useEffect(() => () => speechRecognitionRef.current?.stop(), []);

  // Open Edit Modal
  const openEditModal = (meeting) => {
    setSelectedMeeting(meeting);
    setEditForm({
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      durationMinutes: meeting.durationMinutes || 60,
      venue: meeting.venue,
      chairperson: meeting.chairperson,
      agenda: meeting.agenda,
      status: meeting.status,
    });
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/meetings/${selectedMeeting._id}`, editForm);
      setShowEditModal(false);
      fetchMeetings();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update meeting");
    }
  };

  // Delete Meeting
  const handleDeleteMeeting = async (id, meetingNumber) => {
    if (!window.confirm(`Are you sure you want to delete Meeting #${meetingNumber}?`)) return;
    try {
      await api.delete(`/meetings/${id}`);
      fetchMeetings();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete meeting");
    }
  };

  // Filtered list
  const filteredMeetings = meetings.filter((m) => {
    if (filter === "All") return true;
    return m.status === filter;
  });

  return (
    <div className="meeting-page-container">
      <div className="container">
        {/* HERO HEADER */}
        <div className="meeting-hero d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="meeting-hero-tag">Module 3 • {t("govtTagline")}</span>
            <h1 className="meeting-hero-title">{t("meetingsHeroTitle")}</h1>
            <p className="meeting-hero-subtitle">
              {t("meetingsHeroSubtitle")}
            </p>
          </div>
          <div>
            {isSecretary ? (
              <button
                className="btn btn-light fw-bold px-4 py-2 text-primary shadow-sm"
                onClick={() => setShowScheduleModal(true)}
                style={{ borderRadius: "12px" }}
              >
                {t("scheduleMeetingBtn")}
              </button>
            ) : isMember ? (
              <span className="badge bg-light text-primary px-3 py-2 border shadow-sm">
                {t("memberViewBadge")}
              </span>
            ) : (
              <Link
                to="/login"
                className="btn btn-light fw-bold px-3 py-2 text-primary shadow-sm"
                style={{ borderRadius: "12px" }}
              >
                🔒 {t("login")} (Secretary)
              </Link>
            )}
          </div>
        </div>

        {/* MEMBER NOTICE BANNER */}
        {isMember && (
          <div className="alert alert-info border-0 shadow-sm mb-4 d-flex align-items-center gap-3 py-3">
            <span className="fs-3">📌</span>
            <div>
              <strong>{t("welcome")}, {user.name}! ({t("member")})</strong>
              <p className="mb-0 small text-muted">
                {t("readOnlyNotice")}
              </p>
            </div>
          </div>
        )}

        {/* METRICS ROW */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="stat-card-widget">
              <div className="stat-card-icon icon-blue">📅</div>
              <div>
                <div className="stat-card-val">{stats.totalMeetings}</div>
                <div className="stat-card-lbl">{t("kpiMeetingsHeld")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card-widget">
              <div className="stat-card-icon icon-amber">⏳</div>
              <div>
                <div className="stat-card-val">{stats.scheduledCount}</div>
                <div className="stat-card-lbl">{t("upcomingFilter")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card-widget">
              <div className="stat-card-icon icon-emerald">✅</div>
              <div>
                <div className="stat-card-val">{stats.completedCount}</div>
                <div className="stat-card-lbl">{t("completedFilter")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="filter-pills-bar">
          <button
            className={`filter-pill-btn ${filter === "All" ? "active" : ""}`}
            onClick={() => setFilter("All")}
          >
            {t("allMeetingsFilter")} ({stats.totalMeetings})
          </button>
          <button
            className={`filter-pill-btn ${filter === "Scheduled" ? "active" : ""}`}
            onClick={() => setFilter("Scheduled")}
          >
            {t("upcomingFilter")} ({stats.scheduledCount})
          </button>
          <button
            className={`filter-pill-btn ${filter === "Completed" ? "active" : ""}`}
            onClick={() => setFilter("Completed")}
          >
            {t("completedFilter")} ({stats.completedCount})
          </button>
        </div>

        {/* MEETINGS GRID */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted mt-2">Loading meetings...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="meeting-empty-state">
            <div className="empty-icon">📋</div>
            <h5 className="fw-bold text-dark mb-1">No Meetings Found</h5>
            <p className="text-muted mb-3">
              {filter === "All"
                ? "No NHG meetings have been scheduled yet. Click below to schedule your first meeting."
                : `No meetings in '${filter}' status.`}
            </p>
            {filter === "All" && (
              <button
                className="btn btn-primary fw-semibold"
                onClick={() => setShowScheduleModal(true)}
              >
                Schedule First Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="row g-4">
            {filteredMeetings.map((item) => (
              <div className="col-lg-4 col-md-6" key={item._id}>
                <div className="meeting-card">
                  <div className="meeting-card-header">
                    <span className="meeting-num-badge">
                      {t("meetingNoLabel")}{item.meetingNumber}
                    </span>
                    <span
                      className={
                        item.status === "Completed"
                          ? "badge-status-completed"
                          : "badge-status-scheduled"
                      }
                    >
                      {item.status === "Completed" ? `✓ ${t("completedFilter")}` : `⏳ ${t("upcomingFilter")}`}
                    </span>
                  </div>

                  <h3 className="meeting-card-title">{item.title}</h3>

                  <div className="meeting-meta-item">
                    <span className="meeting-meta-icon">📅</span>
                    <span><strong>{t("date")}:</strong> {item.date}</span>
                  </div>
                  <div className="meeting-meta-item">
                    <span className="meeting-meta-icon">⏰</span>
                    <span><strong>{t("time")}:</strong> {item.time}{item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}</span>
                  </div>
                  <div className="meeting-meta-item">
                    <span className="meeting-meta-icon">📍</span>
                    <span><strong>{t("venue")}:</strong> {item.venue}</span>
                  </div>
                  <div className="meeting-meta-item">
                    <span className="meeting-meta-icon">👤</span>
                    <span><strong>{t("chairpersonLabel")}:</strong> {item.chairperson}</span>
                  </div>

                  <div className="meeting-agenda-box">
                    <strong>{t("agenda")}:</strong> {item.agenda || "General NHG discussion."}
                  </div>

                  {item.status === "Completed" && item.minutes && (
                    <div className="meeting-minutes-preview">
                      <strong>{t("minutesLabel")}:</strong>
                      <p className="mb-0 text-truncate" title={item.minutes}>
                        {item.minutes}
                      </p>
                      {item.totalAttendees > 0 && (
                        <small className="d-block mt-1 text-muted">
                          👥 {t("attendeesLabel")}: {item.totalAttendees}
                        </small>
                      )}
                    </div>
                  )}

                  {item.status === "Scheduled" && item.minutesDraft && (
                    <div className="alert alert-warning py-2 px-3 small mt-2 mb-0">
                      <strong>📖 Minute book draft saved</strong>
                      <p className="mb-0 text-truncate" title={item.minutesDraft}>{item.minutesDraft}</p>
                    </div>
                  )}

                  <div className="meeting-card-actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setSelectedMeeting(item);
                        setShowDetailsModal(true);
                      }}
                    >
                      {t("detailsBtn")}
                    </button>

                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => shareMeetingToWhatsApp(item)}
                      title="Share notice on WhatsApp to all members"
                    >
                      {t("whatsappShareBtn")}
                    </button>

                    {isSecretary && (
                      <>
                        {item.status === "Scheduled" ? (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => openMinutesModal(item)}
                          >
                            {t("recordMinutesBtn")}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openMinutesModal(item)}
                          >
                            {t("editMinutesBtn")}
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openEditModal(item)}
                        >
                          ✏️ {t("edit")}
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteMeeting(item._id, item.meetingNumber)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: SCHEDULE MEETING
      ======================================================== */}
      {showScheduleModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">📅 Schedule NHG Meeting</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowScheduleModal(false)}
              ></button>
            </div>
            <form onSubmit={handleScheduleSubmit}>
              <div className="custom-modal-body">
                <div className="form-group-item">
                  <label className="form-group-label">Meeting Title *</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="e.g. Weekly Ayalkoottam Meeting #1"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 form-group-item">
                    <label className="form-group-label">Date *</label>
                    <input
                      type="date"
                      className="form-control-input"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6 form-group-item">
                    <label className="form-group-label">Time *</label>
                    <input
                      type="text"
                      className="form-control-input"
                      placeholder="e.g. 04:30 PM"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">{isMalayalam ? "നിശ്ചയിച്ച ദൈർഘ്യം (മിനിറ്റ്) *" : "Planned duration (minutes) *"}</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    className="form-control-input"
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: e.target.value })}
                    required
                  />
                  <small className="text-muted">{isMalayalam ? "നിശ്ചയിച്ച അവസാന സമയത്തിന് 15 മിനിറ്റ് മുമ്പ് മിനിറ്റ്സ് ബുക്ക് തുറക്കും." : "The minute book will open 15 minutes before the planned end."}</small>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Venue / Location *</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="e.g. Community Hall / Ward 15"
                    value={scheduleForm.venue}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Chairperson</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="e.g. President / Secretary Name"
                    value={scheduleForm.chairperson}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, chairperson: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Discussion Agenda</label>
                  <textarea
                    rows="3"
                    className="form-control-input"
                    placeholder="e.g. 1. Weekly thrift savings, 2. Loan repayment review, 3. Community health camp"
                    value={scheduleForm.agenda}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  ✓ Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: RECORD MINUTES & RESOLUTIONS
      ======================================================== */}
      {showMinutesModal && selectedMeeting && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">
                📖 Minute Book - Meeting #{selectedMeeting.meetingNumber}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeMinutesModal}
              ></button>
            </div>
            <form onSubmit={handleMinutesSubmit}>
              <div className="custom-modal-body">
                <div className="alert alert-info py-2 small">
                  {isMalayalam
                    ? <>നിങ്ങളുടെ കുറിപ്പുകൾ ഡ്രാഫ്റ്റായി സ്വയം സേവ് ചെയ്യും. പരിശോധിച്ച ശേഷം <strong>മിനിറ്റ്സ് സേവ് ചെയ്ത് യോഗം പൂർത്തിയാക്കുക</strong> തിരഞ്ഞെടുക്കുക.</>
                    : <>Your notes autosave as a draft. Review them, then choose <strong>Save Minutes &amp; Mark Completed</strong> to close the meeting officially.</>}
                </div>

                {selectedMeeting.status === "Scheduled" && <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <button type="button" className={`btn btn-sm ${speechStatus === "listening" ? "btn-danger" : "btn-outline-primary"}`} onClick={speechStatus === "listening" ? stopVoiceCapture : startVoiceCapture}>
                    {speechStatus === "listening"
                      ? (isMalayalam ? "⏹ ശബ്ദരേഖപ്പെടുത്തൽ നിർത്തുക" : "⏹ Stop voice capture")
                      : (isMalayalam ? "🎙️ മിനിറ്റ്സ് സംസാരിച്ച് രേഖപ്പെടുത്തുക" : "🎙️ Speak minutes")}
                  </button>
                  <span className={`badge ${draftSaveStatus === "error" ? "text-bg-danger" : ["saving", "editing"].includes(draftSaveStatus) ? "text-bg-warning" : "text-bg-success"}`}>
                    {draftSaveStatus === "error" ? (isMalayalam ? "ഡ്രാഫ്റ്റ് സേവ് ആയില്ല" : "Draft not saved") : draftSaveStatus === "saving" ? (isMalayalam ? "സേവ് ചെയ്യുന്നു…" : "Saving draft…") : draftSaveStatus === "editing" ? (isMalayalam ? "സേവ് ചെയ്യാനുണ്ട്" : "Unsaved changes") : (isMalayalam ? "ഡ്രാഫ്റ്റ് സേവ് ചെയ്തു" : "Draft saved")}
                  </span>
                  {speechStatus === "listening" && <span className="small text-danger fw-semibold">● {isMalayalam ? "കേൾക്കുന്നു…" : "Listening…"}</span>}
                  {speechStatus === "unsupported" && <span className="small text-warning">{isMalayalam ? "ഈ ബ്രൗസറിൽ ശബ്ദ എഴുത്ത് പിന്തുണയ്ക്കുന്നില്ല. Chrome അല്ലെങ്കിൽ Edge ഉപയോഗിക്കുക, അല്ലെങ്കിൽ മിനിറ്റ്സ് ടൈപ്പ് ചെയ്യുക." : "This browser does not support voice typing. Try Chrome or Edge, or type the minutes instead."}</span>}
                  {speechStatus === "permission" && <span className="small text-warning">{isMalayalam ? "ഈ സൈറ്റിന് ബ്രൗസർ ക്രമീകരണങ്ങളിൽ മൈക്രോഫോൺ അനുമതി നൽകുക; തുടർന്ന് വീണ്ടും ശ്രമിക്കുക." : "Allow microphone access for this site in browser settings, then try again."}</span>}
                  {speechStatus === "error" && <span className="small text-warning" role="status">
                    {isMalayalam
                      ? (speechError === "audio-capture" ? "മൈക്രോഫോൺ കണ്ടെത്താനായില്ല. അത് കണക്റ്റ് ചെയ്തിട്ടുണ്ടോ പരിശോധിക്കുക."
                        : speechError === "no-speech" ? "ശബ്ദം കേട്ടില്ല. മൈക്രോഫോണിന് അടുത്ത് സംസാരിച്ചു വീണ്ടും ശ്രമിക്കുക."
                          : speechError === "network" || speechError === "service-not-allowed" ? "ശബ്ദ സേവനം ലഭ്യമല്ല. ഇന്റർനെറ്റ് പരിശോധിച്ച് Chrome അല്ലെങ്കിൽ Edge-ൽ വീണ്ടും ശ്രമിക്കുക."
                            : "ശബ്ദരേഖപ്പെടുത്തൽ ആരംഭിക്കാനായില്ല. മൈക്രോഫോൺ, ഇന്റർനെറ്റ്, ബ്രൗസർ അനുമതി എന്നിവ പരിശോധിക്കുക.")
                      : (speechError === "audio-capture" ? "No microphone was found. Check that a microphone is connected."
                        : speechError === "no-speech" ? "No speech was detected. Speak near the microphone and try again."
                          : speechError === "network" || speechError === "service-not-allowed" ? "The browser speech service is unavailable. Check your internet and try again in Chrome or Edge."
                            : "Voice capture could not start. Check your microphone, internet connection, and browser permission.")}
                  </span>}
                </div>}

                <div className="form-group-item">
                  <label className="form-group-label">Total Members Attended</label>
                  <input
                    type="number"
                    className="form-control-input"
                    placeholder="e.g. 18"
                    value={minutesForm.totalAttendees}
                    onChange={(e) => setMinutesForm({ ...minutesForm, totalAttendees: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">{isMalayalam ? "യോഗ മിനിറ്റ്സ്, ചർച്ചകൾ, തീരുമാനങ്ങൾ *" : "Minutes, discussions & resolutions *"}</label>
                  <textarea
                    rows="6"
                    className="form-control-input"
                    placeholder={isMalayalam ? "മിനിറ്റ്സ് ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക. ചർച്ചകൾ, തീരുമാനങ്ങൾ, സമ്പാദ്യം, വായ്പ, തുടർനടപടികൾ എന്നിവ ഉൾപ്പെടുത്തുക…" : "Type minutes or use Speak minutes. Include discussions, decisions, thrift and loan updates, and action points…"}
                    value={minutesForm.minutes}
                    onChange={(e) => {
                      minutesRef.current = e.target.value;
                      setMinutesForm({ ...minutesForm, minutes: e.target.value });
                      setDraftSaveStatus("editing");
                    }}
                    required
                  ></textarea>
                  {interimTranscript && <div className="small text-muted mt-1" aria-live="polite">{isMalayalam ? "കേൾക്കുന്നത്:" : "Hearing:"} {interimTranscript}</div>}
                </div>
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeMinutesModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success fw-bold px-3" disabled={speechStatus === "listening" || !minutesForm.minutes.trim()}>
                  {isMalayalam ? "💾 മിനിറ്റ്സ് സേവ് ചെയ്ത് യോഗം പൂർത്തിയാക്കുക" : "💾 Save Minutes & Mark Completed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: VIEW MEETING DETAILS
      ======================================================== */}
      {showDetailsModal && selectedMeeting && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">
                Meeting #{selectedMeeting.meetingNumber} - {selectedMeeting.title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowDetailsModal(false)}
              ></button>
            </div>
            <div className="custom-modal-body">
              <div className="mb-3">
                <span
                  className={
                    selectedMeeting.status === "Completed"
                      ? "badge-status-completed"
                      : "badge-status-scheduled"
                  }
                >
                  {selectedMeeting.status}
                </span>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <strong>📅 Date:</strong> {selectedMeeting.date}
                </div>
                <div className="col-6">
                  <strong>⏰ Time:</strong> {selectedMeeting.time}
                </div>
                <div className="col-6">
                  <strong>📍 Venue:</strong> {selectedMeeting.venue}
                </div>
                <div className="col-6">
                  <strong>👤 Chairperson:</strong> {selectedMeeting.chairperson}
                </div>
                {selectedMeeting.totalAttendees > 0 && (
                  <div className="col-12">
                    <strong>👥 Attendees:</strong> {selectedMeeting.totalAttendees} members
                  </div>
                )}
              </div>

              <div className="p-3 bg-light rounded-3 mb-3 border">
                <h6 className="fw-bold mb-1">Agenda</h6>
                <p className="mb-0 text-secondary">{selectedMeeting.agenda}</p>
              </div>

              {selectedMeeting.minutes ? (
                <div className="p-3 bg-success-subtle rounded-3 border border-success-subtle">
                  <h6 className="fw-bold text-success mb-1">Official Minutes & Resolutions</h6>
                  <p className="mb-0 text-dark" style={{ whiteSpace: "pre-line" }}>
                    {selectedMeeting.minutes}
                  </p>
                </div>
              ) : (
                <div className="text-muted small italic">
                  No minutes recorded yet. Meeting is scheduled.
                </div>
              )}
            </div>
            <div className="custom-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: EDIT MEETING
      ======================================================== */}
      {showEditModal && selectedMeeting && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">
                ✏️ Edit Meeting #{selectedMeeting.meetingNumber}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowEditModal(false)}
              ></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="custom-modal-body">
                <div className="form-group-item">
                  <label className="form-group-label">Title</label>
                  <input
                    type="text"
                    className="form-control-input"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-6 form-group-item">
                    <label className="form-group-label">Date</label>
                    <input
                      type="date"
                      className="form-control-input"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-6 form-group-item">
                    <label className="form-group-label">Time</label>
                    <input
                      type="text"
                      className="form-control-input"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Planned duration (minutes) *</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    className="form-control-input"
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Venue</label>
                  <input
                    type="text"
                    className="form-control-input"
                    value={editForm.venue}
                    onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Chairperson</label>
                  <input
                    type="text"
                    className="form-control-input"
                    value={editForm.chairperson}
                    onChange={(e) => setEditForm({ ...editForm, chairperson: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Agenda</label>
                  <textarea
                    rows="3"
                    className="form-control-input"
                    value={editForm.agenda}
                    onChange={(e) => setEditForm({ ...editForm, agenda: e.target.value })}
                  ></textarea>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Status</label>
                  <select
                    className="form-control-input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: BROADCAST / NOTIFICATION DISPATCHED TO MEMBERS
      ======================================================== */}
      {showBroadcastModal && newlyScheduledMeeting && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-success text-white">
              <h5 className="custom-modal-title text-white">
                🎉 Meeting Scheduled & Notice Dispatched!
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowBroadcastModal(false)}
              ></button>
            </div>
            <div className="custom-modal-body">
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
                <span className="fs-4">📢</span>
                <div>
                  <strong>Notification Published for All NHG Members!</strong>
                  <p className="mb-0 small text-muted">
                    Members will see this meeting alert in their top notification bell immediately.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-light rounded-3 border mb-3">
                <h6 className="fw-bold mb-2">Meeting Details:</h6>
                <div className="small">
                  <p className="mb-1"><strong>📌 Title:</strong> #{newlyScheduledMeeting.meetingNumber} - {newlyScheduledMeeting.title}</p>
                  <p className="mb-1"><strong>📅 Date & Time:</strong> {newlyScheduledMeeting.date} at {newlyScheduledMeeting.time}</p>
                  <p className="mb-1"><strong>📍 Venue:</strong> {newlyScheduledMeeting.venue}</p>
                  <p className="mb-0"><strong>📝 Agenda:</strong> {newlyScheduledMeeting.agenda}</p>
                </div>
              </div>

              <div className="card p-3 border-success-subtle bg-success-subtle">
                <h6 className="fw-bold text-success mb-1">📲 WhatsApp Group Broadcast</h6>
                <p className="small text-muted mb-2">
                  Send this official Kudumbashree notice directly to your NHG members WhatsApp group with 1 click:
                </p>
                <button
                  className="btn btn-success fw-bold d-flex align-items-center justify-content-center gap-2"
                  onClick={() => shareMeetingToWhatsApp(newlyScheduledMeeting)}
                >
                  <span>💬 Broadcast Notice on WhatsApp</span>
                </button>
              </div>
            </div>
            <div className="custom-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowBroadcastModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;
