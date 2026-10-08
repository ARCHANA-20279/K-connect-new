import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const AttendanceKiosk = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase().replace(/[-_]/g, "");
  const isSecretary = normalizedRole === "secretary" || normalizedRole === "nhgsecretary";
  const isMember = normalizedRole === "member";

  // Meetings state
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [meetingData, setMeetingData] = useState(null);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [refreshingAttendance, setRefreshingAttendance] = useState(false);

  // Active view tab for Secretary / Member
  // Secretary: 'displayQr' | 'scanner'
  // Member: 'scanner' | 'myMeetings'
  const [viewMode, setViewMode] = useState(isSecretary ? "displayQr" : "scanner");
  const [activeRollTab, setActiveRollTab] = useState("present"); // 'present' | 'absent'

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // default rear camera on phones
  const [cameraError, setCameraError] = useState("");
  const [lastScannedText, setLastScannedText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Member attendance statuses for scheduled meetings
  const [memberStatusMap, setMemberStatusMap] = useState({});

  // Refs
  const html5QrCodeRef = useRef(null);
  const isStartingRef = useRef(false);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);
  const fileInputRef = useRef(null);

  // Audio chime synthesizer
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(784, ctx.currentTime);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.log("Audio not played:", e);
    }
  };

  // 1. Fetch all meetings to populate the selector
  const fetchMeetingsList = async () => {
    try {
      const res = await api.get("/meetings");
      const list = res.data.meetings || [];
      setMeetings(list);

      // Default select the latest scheduled meeting, or first meeting
      if (list.length > 0 && !selectedMeetingId) {
        const scheduled = list.find((m) => m.status === "Scheduled");
        const defaultId = scheduled ? scheduled._id : list[0]._id;
        setSelectedMeetingId(defaultId);
      }
    } catch (err) {
      console.error("Failed to load meetings list:", err);
    }
  };

  const handleRefreshAttendance = async () => {
    setRefreshingAttendance(true);
    try {
      await fetchMeetingsList();
      if (selectedMeetingId) await fetchMeetingAttendance(selectedMeetingId);
      if (isMember) await checkMemberAttendanceStatus();
    } finally {
      setRefreshingAttendance(false);
    }
  };

  // 2. Fetch attendance & QR token data for the selected meeting
  const fetchMeetingAttendance = async (meetingId) => {
    if (!meetingId) return;
    try {
      setLoadingMeeting(true);
      const res = await api.get(`/attendance/meeting/${meetingId}`);
      setMeetingData(res.data);
    } catch (err) {
      console.error("Failed to load meeting attendance data:", err);
    } finally {
      setLoadingMeeting(false);
    }
  };

  // 3. For members: check which scheduled meetings the logged-in member has attended
  const checkMemberAttendanceStatus = async () => {
    if (!user || !isMember) return;
    try {
      const res = await api.get("/attendance/history");
      const records = res.data.records || [];
      const myMemberId = user.memberId || "";
      const map = {};
      records.forEach((rec) => {
        if (rec.memberId === myMemberId && rec.meetingId) {
          map[rec.meetingId] = rec;
        }
      });
      setMemberStatusMap(map);
    } catch (err) {
      console.error("Failed to check member status:", err);
    }
  };

  useEffect(() => {
    fetchMeetingsList();
  }, []);

  useEffect(() => {
    if (selectedMeetingId) {
      fetchMeetingAttendance(selectedMeetingId);
    }
  }, [selectedMeetingId]);

  useEffect(() => {
    checkMemberAttendanceStatus();
  }, [user, feedback, isMember]);

  // Periodic poll for Secretary to see live attendee counts updating
  useEffect(() => {
    if (isSecretary && selectedMeetingId && viewMode === "displayQr") {
      const interval = setInterval(() => {
        fetchMeetingAttendance(selectedMeetingId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isSecretary, selectedMeetingId, viewMode]);

  // Process Member Scanning the Secretary's Meeting QR Code
  const processMeetingScan = async (scannedText) => {
    if (!scannedText || processing) return;

    const trimmed = scannedText.trim();
    setLastScannedText(trimmed);

    // Prevent immediate repeated triggers (3.5 second cooldown)
    const now = Date.now();
    if (
      lastScannedCodeRef.current === trimmed &&
      now - lastScannedTimeRef.current < 3500
    ) {
      return;
    }

    lastScannedCodeRef.current = trimmed;
    lastScannedTimeRef.current = now;
    setProcessing(true);

    try {
      // Backend derives the member identity from JWT (req.user)
      const res = await api.post("/attendance/scan-meeting", { qrData: trimmed });

      playBeep();
      setActiveRollTab("present");
      const scannedMeetingId = res.data.meeting?._id;
      if (scannedMeetingId) {
        setSelectedMeetingId(scannedMeetingId);
        fetchMeetingAttendance(scannedMeetingId);
      }
      setFeedback({
        type: "success",
        title: "Attendance Recorded!",
        message: res.data.message || "Your attendance has been successfully recorded.",
        meeting: res.data.meeting,
        member: res.data.member,
      });

      checkMemberAttendanceStatus();
    } catch (err) {
      console.error("Scan attendance error:", err);
      const resData = err.response?.data;

      // Duplicate check: Exact text required
      if (
        resData?.alreadyMarked ||
        resData?.message === "Attendance already marked for this meeting."
      ) {
        setActiveRollTab("present");
        const scannedMeetingId = resData?.meeting?._id;
        if (scannedMeetingId) {
          setSelectedMeetingId(scannedMeetingId);
          fetchMeetingAttendance(scannedMeetingId);
        }
        setFeedback({
          type: "warning",
          title: "Already Recorded",
          message: "Attendance already marked for this meeting.",
          meeting: resData?.meeting,
        });
      } else {
        setFeedback({
          type: "danger",
          title: "Attendance Failed",
          message:
            resData?.message ||
            "Could not mark attendance. Please verify you scanned a valid active Meeting QR code.",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // File upload scanner
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tempScanner = new Html5Qrcode("attendance-hidden-file-reader", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      processMeetingScan(decodedText);
    } catch (err) {
      console.error("File scan error:", err);
      alert("Could not detect a QR code from this image. Please ensure the QR image is clear and well-lit.");
    } finally {
      e.target.value = "";
    }
  };

  // Secretary manually marks a member present for the selected meeting
  const handleManualMark = async (memberId) => {
    if (!selectedMeetingId) return;
    try {
      const res = await api.post("/attendance/manual", {
        memberId,
        meetingId: selectedMeetingId,
        status: "Present",
      });
      playBeep();
      setFeedback({
        type: "success",
        title: "Marked Present (Manual)",
        message: res.data.message,
      });
      fetchMeetingAttendance(selectedMeetingId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark attendance manually.");
    }
  };

  // Secretary regenerates QR token for current meeting
  const handleRefreshToken = async () => {
    if (!selectedMeetingId) return;
    try {
      await api.post(`/attendance/meeting/${selectedMeetingId}/token`);
      fetchMeetingAttendance(selectedMeetingId);
      alert("Meeting QR attendance token refreshed successfully.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to refresh token.");
    }
  };

  // Reset meeting attendance (Secretary testing utility)
  const handleResetMeetingAttendance = async () => {
    if (!selectedMeetingId) return;
    const confirmReset = window.confirm(
      "Are you sure you want to clear attendance records for this meeting? This allows members to scan again for testing."
    );
    if (!confirmReset) return;

    try {
      const res = await api.delete(`/attendance/today?meetingId=${selectedMeetingId}`);
      alert(res.data.message);
      setFeedback(null);
      setLastScannedText("");
      fetchMeetingAttendance(selectedMeetingId);
      checkMemberAttendanceStatus();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset attendance");
    }
  };

  // Stop camera helper
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.log("Stop camera error ignored:", err);
    } finally {
      setScannerActive(false);
      isStartingRef.current = false;
    }
  };

  // Start camera helper
  const startCamera = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError("");

    try {
      await stopCamera();

      const scanner = new Html5Qrcode("kiosk-reader-box", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });

      html5QrCodeRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: {
          width: 260,
          height: 260,
        },
      };

      try {
        await scanner.start(
          { facingMode: facingMode },
          config,
          (decodedText) => {
            console.log("Meeting QR Detected:", decodedText);
            processMeetingScan(decodedText);
          },
          () => {} // silent on frame search
        );
      } catch (facingErr) {
        console.warn("Could not start with requested camera, trying default:", facingErr);
        await scanner.start(
          true,
          config,
          (decodedText) => {
            console.log("Meeting QR Detected:", decodedText);
            processMeetingScan(decodedText);
          },
          () => {}
        );
      }

      setScannerActive(true);
    } catch (err) {
      console.error("Camera start failed:", err);
      setCameraError(
        "Camera not accessible or permission denied. You can scan by uploading a photo of the QR code using the button below."
      );
      setScannerActive(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  // Switch camera between front and rear
  const toggleFacingMode = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Manage camera lifecycle based on viewMode
  useEffect(() => {
    if (viewMode === "scanner") {
      const timer = setTimeout(() => {
        startCamera();
      }, 250);

      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [facingMode, viewMode]);

  // Download Meeting QR code as high-res PNG image
  const handleDownloadQR = () => {
    const canvas = document.getElementById("meeting-qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `Kudumbashree_Meeting_${meetingData?.meeting?.meetingNumber || "QR"}_Attendance.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Unauthenticated user prompt
  if (!user) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm border-0 mx-auto p-4" style={{ maxWidth: "480px" }}>
          <span className="fs-1 mb-2">🔒</span>
          <h4 className="fw-bold text-primary">Login Required for Attendance</h4>
          <p className="text-muted small">
            Please log in with your Kudumbashree account. NHG Members scan the meeting QR code
            with their phone to record attendance automatically.
          </p>
          <div className="d-flex justify-content-center gap-2 mt-2">
            <Link to="/login" className="btn btn-primary fw-semibold px-4">
              {t("login")}
            </Link>
            <Link to="/" className="btn btn-outline-secondary px-3">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentMeeting = meetingData?.meeting;

  return (
    <div className="container py-4">
      {/* Hidden file reader element */}
      <div id="attendance-hidden-file-reader" style={{ display: "none" }}></div>

      {/* HEADER SECTION */}
      <div className="text-center mb-4">
        <span className="badge bg-primary px-3 py-2 text-uppercase mb-2">
          Module 2 • {t("govtTagline")}
        </span>
        <h2 className="fw-bold text-primary">Kudumbashree Meeting QR Attendance</h2>
        <p className="text-muted mb-2">
          {isSecretary
            ? "Display the meeting QR code for members to scan with their phones."
            : "Scan the NHG Meeting QR code displayed by the Secretary to record your attendance."}
        </p>

        {/* User Identity Pill */}
        <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border small">
          <span className="fw-bold text-dark">{user.name}</span>
          <span className="badge bg-secondary">{user.role}</span>
          {user.memberId && (
            <span className="text-muted">ID: <strong>{user.memberId}</strong></span>
          )}
        </div>
      </div>

      {/* MEETING SELECTOR BAR */}
      <div className="card shadow-sm border-0 p-3 mb-4 bg-light">
        <div className="row g-3 align-items-center">
          <div className="col-md-7">
            <label className="fw-semibold text-secondary small d-block mb-1">
              📌 Select NHG Meeting:
            </label>
            <select
              className="form-select fw-semibold"
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              disabled={meetings.length === 0}
            >
              {meetings.length === 0 ? (
                <option value="">No meetings scheduled</option>
              ) : (
                meetings.map((m) => (
                  <option key={m._id} value={m._id}>
                    Meeting #{m.meetingNumber} • {m.title} ({m.date} - {m.time}) [{m.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="col-md-5 d-flex justify-content-md-end align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={handleRefreshAttendance}
              disabled={refreshingAttendance || loadingMeeting}
              title="Reload meeting and attendance information without changing records"
            >
              {refreshingAttendance || loadingMeeting ? "Refreshing…" : "↻ Refresh Attendance"}
            </button>
            {isSecretary && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleResetMeetingAttendance}
                  title="Testing only: remove attendance records so members can scan again"
                >
                  Clear Records (Testing)
                </button>
                <Link to="/meetings" className="btn btn-sm btn-outline-primary">
                  ➕ Schedule New
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ATTENDANCE METRIC CARDS FOR SELECTED MEETING */}
      {meetingData && (
        <div className="row g-3 mb-4 text-center">
          <div className="col-md-4">
            <div className="card shadow-sm border-0 bg-light p-3">
              <h6 className="text-muted mb-1">Total NHG Members</h6>
              <h3 className="fw-bold text-dark mb-0">{meetingData.totalMembers}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm border-0 bg-success-subtle p-3 text-success">
              <h6 className="text-success mb-1">Marked Present</h6>
              <h3 className="fw-bold mb-0">{meetingData.presentCount}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm border-0 bg-warning-subtle p-3 text-dark">
              <h6 className="text-secondary mb-1">Yet to Arrive</h6>
              <h3 className="fw-bold mb-0">{meetingData.absentCount}</h3>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="row g-4">
        {/* LEFT COLUMN: MEETING QR DISPLAY (SECRETARY) OR PHONE CAMERA SCANNER (MEMBER) */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 p-3 h-100">
            {/* VIEW MODE TOGGLE BUTTONS */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="btn-group btn-group-sm">
                {isSecretary && (
                  <button
                    type="button"
                    className={`btn ${viewMode === "displayQr" ? "btn-primary fw-bold" : "btn-light border"}`}
                    onClick={() => setViewMode("displayQr")}
                  >
                    📢 Display Meeting QR
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${viewMode === "scanner" ? "btn-primary fw-bold" : "btn-light border"}`}
                  onClick={() => setViewMode("scanner")}
                >
                  📷 {isSecretary ? "Test Camera Scanner" : "Scan Meeting QR"}
                </button>
                {isMember && (
                  <button
                    type="button"
                    className={`btn ${viewMode === "myMeetings" ? "btn-primary fw-bold" : "btn-light border"}`}
                    onClick={() => setViewMode("myMeetings")}
                  >
                    📋 My Attendance
                  </button>
                )}
              </div>

              {/* Camera Controls when Scanner is active */}
              {viewMode === "scanner" && (
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={toggleFacingMode}
                    title="Switch camera"
                  >
                    🔄 {facingMode === "environment" ? "Rear" : "Front"}
                  </button>
                  {scannerActive ? (
                    <button className="btn btn-outline-danger" onClick={stopCamera}>
                      Pause
                    </button>
                  ) : (
                    <button className="btn btn-outline-success" onClick={startCamera}>
                      Start
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB 1: DISPLAY MEETING QR (SECRETARY ROLE) */}
            {viewMode === "displayQr" && (
              <div>
                {loadingMeeting ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted small mt-2">Loading meeting QR code...</p>
                  </div>
                ) : !currentMeeting ? (
                  <div className="text-center py-5 text-muted">
                    <p>No meeting selected. Please select or schedule a meeting first.</p>
                  </div>
                ) : (
                  <div className="p-3 text-center bg-light rounded-3 border">
                    <div className="mb-2">
                      <span
                        className={`badge ${
                          currentMeeting.status === "Scheduled"
                            ? "bg-success"
                            : "bg-secondary"
                        } px-3 py-1 rounded-pill`}
                      >
                        {currentMeeting.status === "Scheduled"
                          ? "✓ Active Attendance QR"
                          : `Status: ${currentMeeting.status}`}
                      </span>
                    </div>

                    <h5 className="fw-bold text-dark mb-1">
                      Meeting #{currentMeeting.meetingNumber}: {currentMeeting.title}
                    </h5>
                    <p className="text-muted small mb-3">
                      📅 {currentMeeting.date} • ⏰ {currentMeeting.time} • 📍 {currentMeeting.venue}
                    </p>

                    {/* QR Code Canvas */}
                    <div
                      className="d-inline-block p-3 bg-white rounded-3 shadow-sm my-2"
                      style={{ border: "3px solid #0d6efd" }}
                    >
                      <QRCodeCanvas
                        id="meeting-qr-canvas"
                        value={meetingData?.qrData || ""}
                        size={220}
                        level="H"
                        includeMargin={true}
                      />
                      <div className="mt-2 text-center font-monospace small text-muted">
                        Token: {currentMeeting.attendanceToken?.substring(0, 16) || "Active"}...
                      </div>
                    </div>

                    <p className="small text-muted mt-2 mb-3" style={{ maxWidth: "380px", margin: "0 auto" }}>
                      📢 Display this QR code on screen or print it. NHG members scan it using their
                      own phones to record attendance.
                    </p>

                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm px-3"
                        onClick={handleDownloadQR}
                      >
                        📥 Download Meeting QR (PNG)
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-3"
                        onClick={handleRefreshToken}
                        title="Rotate attendance token to prevent link sharing"
                      >
                        🔄 Refresh Token
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LIVE CAMERA SCANNER (MEMBERS SCANNING MEETING QR) */}
            {viewMode === "scanner" && (
              <div>
                <div className="alert alert-info py-2 small mb-3">
                  📱 <strong>Member Instructions:</strong> Signing in alone does not record attendance.
                  Scan the Secretary's active Meeting QR code; completed or cancelled meetings cannot accept scans.
                </div>

                <div
                  id="kiosk-reader-box"
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    backgroundColor: "#0f172a",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                ></div>

                {cameraError && (
                  <div className="alert alert-warning mt-3 py-2 small">
                    {cameraError}
                  </div>
                )}

                {lastScannedText && (
                  <div className="mt-2 text-center text-muted small text-truncate">
                    Last scanned QR data: <span className="font-monospace">{lastScannedText.substring(0, 50)}...</span>
                  </div>
                )}

                {/* Alternative: Image File Upload */}
                <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Trouble with camera?</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Upload QR Photo / Screenshot
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: MEMBER'S ATTENDANCE STATUS FOR SCHEDULED MEETINGS */}
            {viewMode === "myMeetings" && (
              <div>
                <h6 className="fw-bold mb-3">My Attendance in Scheduled Meetings</h6>
                {meetings.length === 0 ? (
                  <p className="text-muted small">No scheduled meetings found.</p>
                ) : (
                  <div className="list-group">
                    {meetings.map((m) => {
                      const record = memberStatusMap[m._id];
                      const isPresent = Boolean(record);
                      return (
                        <div
                          key={m._id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <strong className="d-block">
                              Meeting #{m.meetingNumber}: {m.title}
                            </strong>
                            <small className="text-muted">
                              📅 {m.date} • ⏰ {m.time} • 📍 {m.venue}
                            </small>
                          </div>
                          <div>
                            {isPresent ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                                ✓ Present
                              </span>
                            ) : m.status === "Scheduled" ? (
                              <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-3 py-2">
                                ⏳ Not Marked
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-muted border px-3 py-2">
                                {m.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SCAN FEEDBACK BANNER */}
            {feedback && (
              <div
                className={`alert alert-${feedback.type} mt-3 shadow-sm border-0 p-3`}
                role="alert"
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="fw-bold mb-1">{feedback.title}</h6>
                    <p className="mb-1 small">{feedback.message}</p>
                    {feedback.meeting && (
                      <div className="small text-muted">
                        <strong>Meeting:</strong> #{feedback.meeting.meetingNumber} - {feedback.meeting.title} ({feedback.meeting.date})
                      </div>
                    )}
                    {feedback.member && (
                      <div className="small text-muted">
                        <strong>Member:</strong> {feedback.member.name} ({feedback.member.memberId})
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-sm"
                    onClick={() => setFeedback(null)}
                  ></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MEETING ROLL-CALL & ATTENDANCE LISTS */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark mb-0">
                Meeting Roll-Call {currentMeeting ? `(#${currentMeeting.meetingNumber})` : ""}
              </h6>
              {currentMeeting && (
                <span className="badge bg-light text-dark border">
                  {currentMeeting.status}
                </span>
              )}
            </div>

            {/* ROLL-CALL TABS */}
            <ul className="nav nav-pills nav-fill mb-3">
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold ${
                    activeRollTab === "present" ? "active bg-success" : "text-dark"
                  }`}
                  onClick={() => setActiveRollTab("present")}
                >
                  Present ({meetingData?.presentCount || 0})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold ${
                    activeRollTab === "absent" ? "active bg-secondary" : "text-dark"
                  }`}
                  onClick={() => setActiveRollTab("absent")}
                >
                  Yet to Arrive ({meetingData?.absentCount || 0})
                </button>
              </li>
            </ul>

            {/* TAB CONTENT: PRESENT MEMBERS */}
            <div
              className="table-responsive"
              style={{ maxHeight: "420px", overflowY: "auto" }}
            >
              {activeRollTab === "present" ? (
                !meetingData || meetingData.presentRecords.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <span className="fs-3 d-block mb-1">⏳</span>
                    <p className="mb-0 fw-semibold">No attendance recorded yet for this meeting.</p>
                    <small>Members will appear here automatically when they scan the meeting QR.</small>
                  </div>
                ) : (
                  <table className="table table-hover align-middle">
                    <thead className="table-light small">
                      <tr>
                        <th>Member ID</th>
                        <th>Name</th>
                        <th>Time</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetingData.presentRecords.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {item.memberId}
                            </span>
                          </td>
                          <td className="fw-semibold">{item.name}</td>
                          <td className="text-muted small">{item.time}</td>
                          <td>
                            <span className="badge bg-success small">
                              Meeting QR
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : !meetingData || meetingData.absentMembers.length === 0 ? (
                <div className="text-center py-5 text-success">
                  <h5>🎉 100% Attendance!</h5>
                  <p className="small text-muted">All active NHG members have marked attendance.</p>
                </div>
              ) : (
                <table className="table table-hover align-middle">
                  <thead className="table-light small">
                    <tr>
                      <th>Member ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      {isSecretary && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {meetingData.absentMembers.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {member.memberId}
                          </span>
                        </td>
                        <td className="fw-semibold">{member.name}</td>
                        <td className="text-muted small">{member.phone}</td>
                        {isSecretary && (
                          <td>
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleManualMark(member.memberId)}
                              title="Secretary manual mark"
                            >
                              ✓ Present
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceKiosk;
