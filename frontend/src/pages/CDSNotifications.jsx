import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const CDSNotifications = () => {
  const { t, i18n } = useTranslation();
  const isMl = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase().replace(/-/g, "_");
  const isAdsOfficer = ["ads_officer", "ads_cds_officer"].includes(role);
  const isCdsOfficer = ["cds_officer", "ads_cds_officer"].includes(role);
  const isOfficer = isAdsOfficer || isCdsOfficer;
  const isSecretary = ["secretary", "nhg_secretary"].includes(role);
  const isMember = role === "member";
  const createNoticeForm = () => ({
    title: "",
    message: "",
    issuingAuthority: isAdsOfficer ? "Ward ADS Committee" : "Panchayath CDS Office",
    category: "Auditing Notice",
    circularNo: "",
    targetAudience: isAdsOfficer ? "All Kudumbashree NHGs" : "All NHG Secretaries & Office Bearers",
  });

  const [notices, setNotices] = useState([]);
  const [memberJobs, setMemberJobs] = useState([]);
  const [memberLoans, setMemberLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cancelJob, setCancelJob] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [speakingNoticeId, setSpeakingNoticeId] = useState(null);
  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  const [form, setForm] = useState(createNoticeForm);

  useEffect(() => {
    if (!speechAvailable) return undefined;
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [speechAvailable]);

  const readNoticeAloud = (noticeId, text) => {
    if (!speechAvailable) return;
    const speech = window.speechSynthesis;
    if (speakingNoticeId === noticeId && speech.speaking) {
      speech.cancel();
      setSpeakingNoticeId(null);
      return;
    }
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isMl ? "ml-IN" : "en-IN";
    utterance.rate = 0.9;
    const voices = speech.getVoices();
    const languagePrefix = isMl ? "ml" : "en";
    const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
    if (isMl && !matchingVoice) {
      window.alert("ഈ ഉപകരണത്തിൽ മലയാളം ശബ്ദം ലഭ്യമല്ല. ബ്രൗസർ ശബ്ദ ക്രമീകരണങ്ങളിൽ Malayalam voice സജ്ജമാക്കി വീണ്ടും ശ്രമിക്കുക.");
      return;
    }
    utterance.voice = matchingVoice || null;
    utterance.onstart = () => setSpeakingNoticeId(noticeId);
    utterance.onend = () => setSpeakingNoticeId(null);
    utterance.onerror = () => setSpeakingNoticeId(null);
    setSpeakingNoticeId(noticeId);
    speech.speak(utterance);
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await api.get(isMember ? "/notifications" : "/notifications?type=CIRCULAR");
      setNotices(res.data.notifications || []);
      if (isMember) {
        const [jobsRes, loansRes] = await Promise.allSettled([api.get("/jobs"), api.get("/loans")]);
        if (jobsRes.status === "fulfilled") setMemberJobs(jobsRes.value.data.jobs || []);
        if (loansRes.status === "fulfilled") setMemberLoans(Array.isArray(loansRes.value.data) ? loansRes.value.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch notices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCancelJob = async (event) => {
    event.preventDefault();
    if (!cancelJob) return;
    try {
      await api.patch(`/jobs/${cancelJob._id}/respond`, { action: "not_interested", reason: cancelReason });
      setCancelJob(null);
      setCancelReason("");
      await fetchNotices();
      alert(isMl ? "നിങ്ങളുടെ കാരണം സെക്രട്ടറിക്ക് അയച്ചു. ഈ ജോലി നിങ്ങൾക്കായി റദ്ദാക്കി." : "Your reason was sent to the Secretary. The assignment was cancelled for you.");
    } catch (err) {
      alert(err.response?.data?.message || (isMl ? "ഈ ജോലി റദ്ദാക്കാനായില്ല." : "Could not cancel this task."));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOfficer) {
      alert("Unauthorized: Only CDS / ADS officers can broadcast circulars.");
      return;
    }
    try {
      await api.post("/notifications", form);
      setShowModal(false);
      setForm(createNoticeForm());
      fetchNotices();
      alert("Official Circular broadcasted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to broadcast circular");
    }
  };

  const handleDeleteNotice = async (id, title) => {
    if (!isOfficer) {
      alert("Unauthorized: Only CDS / ADS officers can delete circulars.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this circular: "${title}"?`)) {
      return;
    }
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotices();
      alert("Official circular removed.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete circular");
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (activeCategory === "ALL") return true;
    if (isMember && activeCategory === "JOBS") return n.type === "JOB";
    if (isMember && activeCategory === "NOTICES") return n.type !== "JOB";
    if (activeCategory === "AUDIT") {
      return (
        n.type === "AUDIT" ||
        (n.category && n.category.toLowerCase().includes("audit")) ||
        (n.title && n.title.toLowerCase().includes("audit"))
      );
    }
    if (activeCategory === "SUBSIDY") {
      return (
        (n.category && n.category.toLowerCase().includes("subsidy")) ||
        (n.title && n.title.toLowerCase().includes("subsidy"))
      );
    }
    if (activeCategory === "DIRECTIVE") {
      return (
        n.category === "General Administrative Directive" ||
        (n.title && n.title.toLowerCase().includes("directive"))
      );
    }
    return true;
  });

  return (
    <div className="portal-page-container">
      <div className="container">
        {/* HERO BANNER */}
        <div className="portal-hero-banner notice-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">{isMl ? "കെ-കണക്ട് • സമൂഹ അറിയിപ്പുകൾ" : "K-CONNECT • COMMUNITY NOTICES"}</span>
            <h1 className="portal-hero-title">{isMember ? (isMl ? "അറിയിപ്പുകളും എന്റെ സന്ദേശങ്ങളും" : "Notices & My Notifications") : t("circularsHeroTitle")}</h1>
            <p className="portal-hero-subtitle mb-1">
              {isMember ? (isMl ? "ഔദ്യോഗിക അറിയിപ്പുകൾ, യോഗ വിവരങ്ങൾ, വായ്പാ സന്ദേശങ്ങൾ, നിങ്ങൾക്ക് നൽകിയ ജോലികൾ എന്നിവ ഇവിടെ കാണാം." : "Official notices, meeting updates, loan messages, and your assigned community work in one place.") : t("circularsHeroSubtitle")}
            </p>
            {!isMember && <div className="small mt-2 d-flex align-items-center gap-1 notice-hero-note">
              <span aria-hidden="true">🏛️</span>
              <span>{t("circularsReadOnlyDesc")}</span>
            </div>}
          </div>
          <div>
            {isOfficer ? (
              <button
                className="btn btn-light fw-bold text-primary px-4 py-2 shadow-sm d-flex align-items-center gap-2"
                style={{ borderRadius: "12px" }}
                onClick={() => setShowModal(true)}
              >
                <span>➕</span>
                <span>{t("publishCircularBtn")}</span>
              </button>
            ) : isSecretary ? (
              <div className="badge bg-light text-dark p-2 px-3 border fs-6 shadow-sm d-flex align-items-center gap-2">
                <span>{t("secretaryReadOnlyBadge")}</span>
              </div>
            ) : isMember ? (
              <div className="badge bg-light text-dark p-2 px-3 border fs-6 shadow-sm d-flex align-items-center gap-2">
                <span>{t("memberViewBadge")}</span>
              </div>
            ) : (
              <Link to="/login" className="btn btn-light fw-bold px-3 py-2 shadow-sm">
                🔒 {t("login")}
              </Link>
            )}
          </div>
        </div>

        {/* INSTITUTIONAL GOVERNANCE NOTICE BAR */}
        <div className="alert alert-info border-0 shadow-sm rounded-3 py-2 px-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 small">
            <span className="fs-5">📋</span>
            <span>
              <strong>{isMember ? (isMl ? "കെ-കണക്ട് അറിയിപ്പ് ബോർഡ്:" : "K-Connect Notice & Notification Board:") : (isMl ? "കുടുംബശ്രീ സി.ഡി.എസ് / എ.ഡി.എസ് അറിയിപ്പ് ബോർഡ്:" : "Kudumbashree CDS / ADS Notice Board:")}</strong> {isMember ? (isMl ? "നിങ്ങളുടെ അയൽക്കൂട്ടത്തിലെ ഔദ്യോഗിക വിവരങ്ങളും വ്യക്തിഗത അറിയിപ്പുകളും ജോലികളും കാണുക." : "View official communications and personal updates from your NHG, including assigned jobs.") : (isMl ? "ഓഡിറ്റ്, സബ്‌സിഡി, സർക്കാർ ഉത്തരവുകൾ എന്നിവയുമായി ബന്ധപ്പെട്ട ഔദ്യോഗിക അറിയിപ്പുകൾ." : "Official communications for statutory audits, subsidies, and state poverty eradication mission orders.")}
              {isSecretary && (
                <span className="ms-1 text-primary-emphasis">
                  ({isMl ? "എൻ.എച്ച്.ജി സെക്രട്ടറിയായി ലോഗിൻ ചെയ്തു:" : "Logged in as NHG Secretary:"} <em>{isMl ? "കാണാൻ മാത്രം" : "Read-Only Access"}</em>)
                </span>
              )}
              {isMember && (
                <span className="ms-1 text-secondary">
                  ({isMl ? "അംഗമായി ലോഗിൻ ചെയ്തു:" : "Logged in as Member:"} <em>{isMl ? "കാണാൻ മാത്രം" : "Read-Only Access"}</em>)
                </span>
              )}
              {isOfficer && (
                <span className="ms-1 text-success fw-bold">
                  ({isMl ? `${isAdsOfficer && isCdsOfficer ? "എ.ഡി.എസ് / സി.ഡി.എസ്" : isAdsOfficer ? "എ.ഡി.എസ്" : "സി.ഡി.എസ്"} ഓഫീസറായി ലോഗിൻ ചെയ്തു:` : `Logged in as ${isAdsOfficer && isCdsOfficer ? "ADS / CDS" : isAdsOfficer ? "ADS" : "CDS"} Officer:`} <em>{isMl ? "അറിയിപ്പുകൾ പ്രസിദ്ധീകരിക്കാനും നിയന്ത്രിക്കാനും അനുമതിയുണ്ട്" : "Authorized to publish and manage notices"}</em>)
                </span>
              )}
            </span>
          </div>
          {isOfficer && (
            <span className="badge bg-success text-white px-2 py-1">
              ✓ {isMl ? `${isAdsOfficer && isCdsOfficer ? "എ.ഡി.എസ് / സി.ഡി.എസ്" : isAdsOfficer ? "എ.ഡി.എസ്" : "സി.ഡി.എസ്"} ഓഫീസർക്ക് അനുമതിയുണ്ട്` : `${isAdsOfficer && isCdsOfficer ? "ADS / CDS" : isAdsOfficer ? "ADS" : "CDS"} Officer Authorized`}
            </span>
          )}
        </div>

        {/* CATEGORY FILTER TABS */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <button
            className={`btn btn-sm ${activeCategory === "ALL" ? "btn-primary" : "btn-light border"}`}
            onClick={() => setActiveCategory("ALL")}
          >
            {isMember ? `📢 ${isMl ? "എല്ലാ അറിയിപ്പുകളും" : "All notifications"} (${notices.length})` : `📜 ${isMl ? "എല്ലാ സർക്കുലറുകളും" : "All Circulars"} (${notices.length})`}
          </button>
          {isMember ? <>
            <button className={`btn btn-sm ${activeCategory === "JOBS" ? "btn-success" : "btn-light border"}`} onClick={() => setActiveCategory("JOBS")}>💼 {isMl ? "ജോലി ചുമതലകൾ" : "Job assignments"} ({notices.filter((n) => n.type === "JOB").length})</button>
            <button className={`btn btn-sm ${activeCategory === "NOTICES" ? "btn-info" : "btn-light border"}`} onClick={() => setActiveCategory("NOTICES")}>📃 {isMl ? "അറിയിപ്പുകളും പുതുക്കലുകളും" : "Notices & updates"} ({notices.filter((n) => n.type !== "JOB").length})</button>
          </> : <>
          <button
            className={`btn btn-sm ${activeCategory === "AUDIT" ? "btn-danger" : "btn-light border"}`}
            onClick={() => setActiveCategory("AUDIT")}
          >
            📑 {isMl ? "ഓഡിറ്റ് അറിയിപ്പുകൾ" : "Auditing Notices"} ({notices.filter((n) => n.type === "AUDIT" || (n.category && n.category.includes("Audit")) || (n.title && n.title.includes("Audit"))).length})
          </button>
          <button
            className={`btn btn-sm ${activeCategory === "SUBSIDY" ? "btn-success" : "btn-light border"}`}
            onClick={() => setActiveCategory("SUBSIDY")}
          >
            🌾 {isMl ? "സബ്‌സിഡികളും പദ്ധതികളും" : "Subsidies & Schemes"} ({notices.filter((n) => (n.category && n.category.includes("Subsidy")) || (n.title && n.title.includes("Subsidy"))).length})
          </button>
          <button
            className={`btn btn-sm ${activeCategory === "DIRECTIVE" ? "btn-dark" : "btn-light border"}`}
            onClick={() => setActiveCategory("DIRECTIVE")}
          >
            📢 {isMl ? "ഭരണ നിർദ്ദേശങ്ങൾ" : "Administrative Directives"}
          </button>
          </>}
        </div>

        {/* NOTICES LIST */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h5 className="portal-card-title">
              {isMember ? (isMl ? "📢 എല്ലാ അറിയിപ്പുകളും സന്ദേശങ്ങളും" : "📢 All notices and notifications") : (isMl ? "📜 ഔദ്യോഗിക എ.ഡി.എസ് / സി.ഡി.എസ് സർക്കുലറുകളും അറിയിപ്പുകളും" : "📜 Official ADS & CDS Circulars & Announcements")}
            </h5>
            <span className="badge bg-light text-dark border">
              {filteredNotices.length} {isMl ? "പ്രസിദ്ധീകരിച്ചു" : "Published"}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-4">{t("loading")}</div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center text-muted py-5">
              <h5>{isMember ? (isMl ? "അറിയിപ്പുകളൊന്നും കണ്ടെത്തിയില്ല" : "No notifications found") : (isMl ? "ഈ വിഭാഗത്തിൽ സർക്കുലറുകളില്ല" : "No circulars found in this category")}</h5>
              <p className="small mb-0">{isMember ? (isMl ? "പുതിയ അയൽക്കൂട്ട അറിയിപ്പുകൾ, യോഗ വിവരങ്ങൾ, വായ്പാ സന്ദേശങ്ങൾ, ജോലി ചുമതലകൾ എന്നിവ ഇവിടെ കാണാം." : "New NHG notices, meeting updates, loan messages, and job assignments will appear here.") : (isMl ? "സി.ഡി.എസ്, എ.ഡി.എസ് അധികാരികൾ പ്രസിദ്ധീകരിക്കുന്ന ഔദ്യോഗിക സർക്കുലറുകൾ ഇവിടെ കാണാം." : "Official circulars published by CDS and ADS authorities will appear here.")}</p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredNotices.map((n) => {
                const isAudit = n.type === "AUDIT" || (n.category && n.category.includes("Audit")) || (n.title && n.title.includes("Audit"));
                const isJobNotice = n.type === "JOB";
                const linkedJob = isJobNotice ? memberJobs.find((job) => String(job._id) === String(n.relatedJob)) : null;
                const isLoanVoteNotice = isMember && n.type === "LOAN" && (n.category === "NHG Loan Vote" || n.targetAudience === "NHG Peer Loan Vote");
                const linkedLoan = isLoanVoteNotice ? memberLoans.find((loan) => String(loan._id) === String(n.relatedLoan)) : null;
                const loanName = linkedLoan?.memberName || n.title.split(":").slice(1).join(":").trim() || "അംഗം";
                const loanAmount = linkedLoan?.amount ?? Number(n.message.match(/₹\s*([\d,]+)/)?.[1]?.replace(/,/g, "") || 0);
                const loanCode = linkedLoan?.loanId || n.message.match(/\bLN-\d+\b/)?.[0];
                const noticeTitle = isMl && isJobNotice && linkedJob
                  ? `പുതിയ ജോലി: ${linkedJob.projectName || linkedJob.taskName} — ${linkedJob.taskName}`
                  : isMl && isLoanVoteNotice
                    ? `അയൽക്കൂട്ട വായ്പാ വോട്ടെടുപ്പ്: ${loanName}`
                    : n.title;
                const noticeMessage = isMl && isJobNotice && linkedJob
                  ? `${linkedJob.assignedBy || "സെക്രട്ടറി"} ${linkedJob.taskName} എന്ന ജോലി ${linkedJob.projectName || "പ്രോജക്റ്റിനായി"} നിങ്ങൾക്ക് നൽകി. താൽപര്യമുണ്ടെന്ന് രേഖപ്പെടുത്തുക, കാരണം നൽകി നിരസിക്കുക, അല്ലെങ്കിൽ പൂർത്തിയാകുമ്പോൾ പൂർത്തിയായതായി അടയാളപ്പെടുത്തുക.`
                  : isMl && isLoanVoteNotice
                    ? `${loanName} ₹${Number(loanAmount).toLocaleString("en-IN")} വായ്പയ്ക്ക് അപേക്ഷിച്ചിട്ടുണ്ട്${loanCode ? `. അപേക്ഷ നമ്പർ ${loanCode}` : ""}. വായ്പാ പേജിൽ അപേക്ഷ പരിശോധിച്ച് അംഗീകരിക്കുകയോ നിരസിക്കുകയോ ചെയ്യുക.`
                    : n.message;
                return (
                  <div className="col-md-6" key={n._id}>
                    <div className={`p-4 bg-white border rounded-3 shadow-sm h-100 d-flex flex-column ${isAudit ? "border-danger-subtle" : ""}`} style={{ borderLeft: isAudit ? "5px solid #dc3545" : "5px solid #0d6efd" }}>
                      <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-1">
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <span className={`badge ${isJobNotice ? "bg-success-subtle text-success border border-success-subtle" : isAudit ? "bg-danger-subtle text-danger border border-danger-subtle" : "bg-primary-subtle text-primary border border-primary-subtle"} small fw-semibold`}>
                            {isJobNotice ? (isMl ? "💼 നൽകിയ ജോലി" : "💼 Assigned community task") : isAudit ? (isMl ? "📑 ഓഡിറ്റ് അറിയിപ്പ്" : "📑 Auditing Notice") : `🏛️ ${n.category || (isMl ? "ഔദ്യോഗിക സർക്കുലർ" : "Official Circular")}`}
                          </span>
                          {!isJobNotice && <span className="badge bg-light text-dark border small">🏢 {n.issuingAuthority || (isMl ? "പഞ്ചായത്ത് സി.ഡി.എസ് ഓഫീസ്" : "Panchayath CDS Office")}</span>}
                          {n.circularNo && (
                            <span className="badge bg-secondary-subtle text-secondary font-monospace small">
                              {n.circularNo}
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 ms-auto">
                          <small className="text-muted">{new Date(n.createdAt).toLocaleDateString()}</small>
                          <button
                            type="button"
                            className={`btn btn-sm ${speakingNoticeId === n._id ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => readNoticeAloud(n._id, `${noticeTitle}. ${noticeMessage}${!isJobNotice && !isLoanVoteNotice ? `. ${isMl ? "അറിയിപ്പ് നൽകിയ സ്ഥാപനം" : "Issued by"}: ${n.issuingAuthority || "CDS"}${n.circularNo ? `. ${isMl ? "റഫറൻസ്" : "Reference"}: ${n.circularNo}` : ""}` : ""}`)}
                            disabled={!speechAvailable}
                            aria-label={speakingNoticeId === n._id ? (isMl ? "വായന നിർത്തുക" : "Stop reading notice") : (isMl ? "അറിയിപ്പ് ശബ്ദമായി കേൾക്കുക" : "Read notice aloud")}
                            title={speechAvailable ? (speakingNoticeId === n._id ? (isMl ? "വായന നിർത്തുക" : "Stop reading") : (isMl ? "ശബ്ദമായി വായിക്കുക" : "Read aloud")) : (isMl ? "ഈ ബ്രൗസറിൽ ശബ്ദ വായന ലഭ്യമല്ല" : "Speech playback is unavailable in this browser")}
                          >
                            {speakingNoticeId === n._id ? "⏹" : "🔊"} <span className="d-none d-sm-inline">{speakingNoticeId === n._id ? (isMl ? "നിർത്തുക" : "Stop") : (isMl ? "കേൾക്കുക" : "Listen")}</span>
                          </button>
                        </div>
                      </div>

                        <h5 className="fw-bold text-dark mb-2 mt-1">{noticeTitle}</h5>
                      <p className="text-secondary small mb-3 flex-grow-1 lh-base">
                        {noticeMessage}
                      </p>

                      {isMember && isJobNotice && linkedJob && <div className="mb-3">
                        {linkedJob.status === "Not Interested" ? <div className="alert alert-warning py-2 mb-2"><strong>{isMl ? "നിങ്ങൾക്കായി റദ്ദാക്കി." : "Cancelled for you."}</strong> {isMl ? "സെക്രട്ടറിക്ക് അയച്ച കാരണം:" : "Reason sent to your Secretary:"} {linkedJob.declineReason}</div> : linkedJob.status === "Completed" ? <div className="alert alert-success py-2 mb-2">{isMl ? "ഈ ജോലി പൂർത്തിയായി എന്ന് നിങ്ങൾ രേഖപ്പെടുത്തി." : "You marked this assignment complete."}</div> : <div className="d-flex flex-wrap gap-2"><Link to="/jobs" className="btn btn-sm btn-outline-primary">{isMl ? "ജോലി പുരോഗതി കാണുക" : "View task progress"}</Link><button className="btn btn-sm btn-outline-danger" onClick={() => { setCancelJob(linkedJob); setCancelReason(""); }}>{isMl ? "കാരണം നൽകി ജോലി റദ്ദാക്കുക" : "Cancel this task with a reason"}</button></div>}
                      </div>}
                      {isMember && isJobNotice && !linkedJob && <Link to="/jobs" className="btn btn-sm btn-outline-primary align-self-start mb-3">{isMl ? "എന്റെ ജോലികൾ തുറക്കുക" : "Open My Jobs"}</Link>}

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                        <span className="badge bg-light text-secondary border">
                          👥 {n.targetAudience || (isMl ? "എല്ലാ അയൽക്കൂട്ട അംഗങ്ങളും" : "All NHG Members")}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          {!isMember && <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => {
                              const text = `📢 *Kudumbashree Official Notice*\n\n📌 *${n.title}*\n🏛️ *Issued by*: ${n.issuingAuthority || "CDS"}\n${n.circularNo ? `🔖 *Ref*: ${n.circularNo}\n` : ""}\n${n.message}\n\n_Sent via K-Connect Official Portal_`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                          >
                            📲 {isMl ? "അറിയിപ്പ് പങ്കിടുക" : "Share Notice"}
                          </button>}
                          {isOfficer && (
                            <button
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              title="Delete this circular (CDS Officer Only)"
                              onClick={() => handleDeleteNotice(n._id, n.title)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* NOTICE EDITOR (ADS / CDS OFFICERS) */}
      {isOfficer && showModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-primary text-white">
              <h5 className="custom-modal-title text-white">🏛️ {isMl ? (isAdsOfficer && !isCdsOfficer ? "എ.ഡി.എസ് അറിയിപ്പ് എഴുതുക, പ്രസിദ്ധീകരിക്കുക" : "എ.ഡി.എസ് / സി.ഡി.എസ് അറിയിപ്പ് എഴുതുക, പ്രസിദ്ധീകരിക്കുക") : (isAdsOfficer && !isCdsOfficer ? "Write and Publish an ADS Notice" : "Write and Publish an ADS / CDS Notice")}</h5>
              <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
            </div>
          <form onSubmit={handleSubmit}>
              <div className="custom-modal-body">
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("issuingAuthority")} *</label>
                    <select
                      className="form-select"
                      value={form.issuingAuthority}
                      onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
                      required
                    >
                      {(!isAdsOfficer || isCdsOfficer) && <option value="Panchayath CDS Office">Panchayath CDS Central Office</option>}
                      {(isAdsOfficer || !isCdsOfficer) && <option value="Ward ADS Committee">Ward ADS Committee</option>}
                      <option value="Kudumbashree District Mission">Kudumbashree District Mission</option>
                      <option value="Local Self Government Dept">Local Self Government Dept (LSGD)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("circularCategory")} *</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      required
                    >
                      <option value="Auditing Notice">📑 Auditing & Inspection Notice</option>
                      <option value="Government Subsidy / Scheme">🌾 Government Subsidy & Agricultural Scheme</option>
                      <option value="Micro-Enterprise Development">💼 Micro-Enterprise & Livelihood Scheme</option>
                      <option value="General Administrative Directive">📢 General Administrative Directive</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("circularRefNo")}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CDS-AUD-2026/015 (Optional)"
                      value={form.circularNo}
                      onChange={(e) => setForm({ ...form, circularNo: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("noticeAudience")}</label>
                    <select
                      className="form-select"
                      value={form.targetAudience}
                      onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                    >
                      <option value="All NHG Secretaries & Office Bearers">All NHG Secretaries & Office Bearers</option>
                      <option value="All Kudumbashree NHGs">All Kudumbashree NHGs & Members</option>
                      <option value="Ward ADS Convenors">Ward ADS Convenors</option>
                      <option value="JLGs & Micro-Enterprise Units">JLGs & Micro-Enterprise Units</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("circularTitleLabel")} *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mandatory Statutory Financial Audit: Passbook & Ledger Verification Schedule"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("noticeContent")} *</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Provide full details of the notice, submission requirements, dates, venues, guidelines, and instructions..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary fw-semibold px-4">
                  ✓ {t("publishCircularBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMember && cancelJob && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-danger text-white">
              <h5 className="custom-modal-title text-white">{isMl ? "ജോലി ചുമതല റദ്ദാക്കുക" : "Cancel assigned task"}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setCancelJob(null)} />
            </div>
            <form onSubmit={handleCancelJob}>
              <div className="custom-modal-body">
                <p>{isMl ? < >നിങ്ങൾ <strong>{cancelJob.taskName}</strong> ജോലി റദ്ദാക്കുകയാണ്. ഈ കാരണം സെക്രട്ടറിക്ക് ലഭിക്കും; അവർക്ക് ജോലി മറ്റൊരാൾക്ക് നൽകാം.</> : <>You are cancelling <strong>{cancelJob.taskName}</strong> in project <strong>{cancelJob.projectName || cancelJob.taskName}</strong>. Your Secretary will receive this reason and can reassign the work.</>}</p>
                <label className="form-label fw-semibold">{isMl ? "റദ്ദാക്കാനുള്ള കാരണം *" : "Reason for cancellation *"}</label>
                <textarea className="form-control" rows="4" minLength="5" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder={isMl ? "ഈ ജോലി ചെയ്യാൻ കഴിയാത്തതിന്റെ കാരണം എഴുതുക." : "Please explain why you cannot take this task."} required />
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setCancelJob(null)}>{isMl ? "ജോലി നിലനിർത്തുക" : "Keep task"}</button>
                <button type="submit" className="btn btn-danger">{isMl ? "കാരണം അയച്ച് റദ്ദാക്കുക" : "Send reason and cancel task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CDSNotifications;
