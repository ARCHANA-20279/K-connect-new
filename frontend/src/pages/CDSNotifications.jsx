import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const CDSNotifications = () => {
  const { t } = useTranslation();
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cancelJob, setCancelJob] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [form, setForm] = useState(createNoticeForm);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await api.get(isMember ? "/notifications" : "/notifications?type=CIRCULAR");
      setNotices(res.data.notifications || []);
      if (isMember) {
        const jobsRes = await api.get("/jobs");
        setMemberJobs(jobsRes.data.jobs || []);
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
      alert("Your reason was sent to the Secretary. The assignment was cancelled for you.");
    } catch (err) {
      alert(err.response?.data?.message || "Could not cancel this task.");
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
        <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">Module 6 • {t("govtTagline")}</span>
            <h1 className="portal-hero-title">{isMember ? "Notices & My Notifications" : t("circularsHeroTitle")}</h1>
            <p className="portal-hero-subtitle mb-1">
              {isMember ? "Official notices, meeting updates, loan messages, and your assigned community work in one place." : t("circularsHeroSubtitle")}
            </p>
            <div className="small text-white-50 mt-1 d-flex align-items-center gap-1">
              <span>🏛️</span>
              <span>{t("circularsReadOnlyDesc")}</span>
            </div>
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
                <span>📖</span>
                <span>{t("secretaryReadOnlyBadge")}</span>
              </div>
            ) : isMember ? (
              <div className="badge bg-light text-dark p-2 px-3 border fs-6 shadow-sm d-flex align-items-center gap-2">
                <span>👥</span>
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
              <strong>{isMember ? "K-Connect Notice & Notification Board:" : "Kudumbashree CDS / ADS Notice Board:"}</strong> {isMember ? "View official communications and personal updates from your NHG, including assigned jobs." : "Official communications for statutory audits, subsidies, and state poverty eradication mission orders."}
              {isSecretary && (
                <span className="ms-1 text-primary-emphasis">
                  (Logged in as NHG Secretary: <em>Read-Only Access</em>)
                </span>
              )}
              {isMember && (
                <span className="ms-1 text-secondary">
                  (Logged in as Member: <em>Read-Only Access</em>)
                </span>
              )}
              {isOfficer && (
                <span className="ms-1 text-success fw-bold">
                  (Logged in as {isAdsOfficer && isCdsOfficer ? "ADS / CDS" : isAdsOfficer ? "ADS" : "CDS"} Officer: <em>Authorized to publish and manage notices</em>)
                </span>
              )}
            </span>
          </div>
          {isOfficer && (
            <span className="badge bg-success text-white px-2 py-1">
              ✓ {isAdsOfficer && isCdsOfficer ? "ADS / CDS" : isAdsOfficer ? "ADS" : "CDS"} Officer Authorized
            </span>
          )}
        </div>

        {/* CATEGORY FILTER TABS */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <button
            className={`btn btn-sm ${activeCategory === "ALL" ? "btn-primary" : "btn-light border"}`}
            onClick={() => setActiveCategory("ALL")}
          >
            {isMember ? `📢 All notifications (${notices.length})` : `📜 All Circulars (${notices.length})`}
          </button>
          {isMember ? <>
            <button className={`btn btn-sm ${activeCategory === "JOBS" ? "btn-success" : "btn-light border"}`} onClick={() => setActiveCategory("JOBS")}>💼 Job assignments ({notices.filter((n) => n.type === "JOB").length})</button>
            <button className={`btn btn-sm ${activeCategory === "NOTICES" ? "btn-info" : "btn-light border"}`} onClick={() => setActiveCategory("NOTICES")}>📃 Notices & updates ({notices.filter((n) => n.type !== "JOB").length})</button>
          </> : <>
          <button
            className={`btn btn-sm ${activeCategory === "AUDIT" ? "btn-danger" : "btn-light border"}`}
            onClick={() => setActiveCategory("AUDIT")}
          >
            📑 Auditing Notices ({notices.filter((n) => n.type === "AUDIT" || (n.category && n.category.includes("Audit")) || (n.title && n.title.includes("Audit"))).length})
          </button>
          <button
            className={`btn btn-sm ${activeCategory === "SUBSIDY" ? "btn-success" : "btn-light border"}`}
            onClick={() => setActiveCategory("SUBSIDY")}
          >
            🌾 Subsidies & Schemes ({notices.filter((n) => (n.category && n.category.includes("Subsidy")) || (n.title && n.title.includes("Subsidy"))).length})
          </button>
          <button
            className={`btn btn-sm ${activeCategory === "DIRECTIVE" ? "btn-dark" : "btn-light border"}`}
            onClick={() => setActiveCategory("DIRECTIVE")}
          >
            📢 Administrative Directives
          </button>
          </>}
        </div>

        {/* NOTICES LIST */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h5 className="portal-card-title">
              {isMember ? "📢 All notices and notifications" : "📜 Official ADS & CDS Circulars & Announcements"}
            </h5>
            <span className="badge bg-light text-dark border">
              {filteredNotices.length} Published
            </span>
          </div>

          {loading ? (
            <div className="text-center py-4">{t("loading")}</div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center text-muted py-5">
              <h5>{isMember ? "No notifications found" : "No circulars found in this category"}</h5>
              <p className="small mb-0">{isMember ? "New NHG notices, meeting updates, loan messages, and job assignments will appear here." : "Official circulars published by CDS and ADS authorities will appear here."}</p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredNotices.map((n) => {
                const isAudit = n.type === "AUDIT" || (n.category && n.category.includes("Audit")) || (n.title && n.title.includes("Audit"));
                const isJobNotice = n.type === "JOB";
                const linkedJob = isJobNotice ? memberJobs.find((job) => String(job._id) === String(n.relatedJob)) : null;
                return (
                  <div className="col-md-6" key={n._id}>
                    <div className={`p-4 bg-white border rounded-3 shadow-sm h-100 d-flex flex-column ${isAudit ? "border-danger-subtle" : ""}`} style={{ borderLeft: isAudit ? "5px solid #dc3545" : "5px solid #0d6efd" }}>
                      <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-1">
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <span className={`badge ${isJobNotice ? "bg-success-subtle text-success border border-success-subtle" : isAudit ? "bg-danger-subtle text-danger border border-danger-subtle" : "bg-primary-subtle text-primary border border-primary-subtle"} small fw-semibold`}>
                            {isJobNotice ? "💼 Assigned community task" : isAudit ? "📑 Auditing Notice" : `🏛️ ${n.category || "Official Circular"}`}
                          </span>
                          {!isJobNotice && <span className="badge bg-light text-dark border small">🏢 {n.issuingAuthority || "Panchayath CDS Office"}</span>}
                          {n.circularNo && (
                            <span className="badge bg-secondary-subtle text-secondary font-monospace small">
                              {n.circularNo}
                            </span>
                          )}
                        </div>
                        <small className="text-muted">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </small>
                      </div>

                      <h5 className="fw-bold text-dark mb-2 mt-1">{n.title}</h5>
                      <p className="text-secondary small mb-3 flex-grow-1 lh-base">
                        {n.message}
                      </p>

                      {isMember && isJobNotice && linkedJob && <div className="mb-3">
                        {linkedJob.status === "Not Interested" ? <div className="alert alert-warning py-2 mb-2"><strong>Cancelled for you.</strong> Reason sent to your Secretary: {linkedJob.declineReason}</div> : linkedJob.status === "Completed" ? <div className="alert alert-success py-2 mb-2">You marked this assignment complete.</div> : <div className="d-flex flex-wrap gap-2"><Link to="/jobs" className="btn btn-sm btn-outline-primary">View task progress</Link><button className="btn btn-sm btn-outline-danger" onClick={() => { setCancelJob(linkedJob); setCancelReason(""); }}>Cancel this task with a reason</button></div>}
                      </div>}
                      {isMember && isJobNotice && !linkedJob && <Link to="/jobs" className="btn btn-sm btn-outline-primary align-self-start mb-3">Open My Jobs</Link>}

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                        <span className="badge bg-light text-secondary border">
                          👥 {n.targetAudience || "All NHG Members"}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          {!isMember && <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => {
                              const text = `📢 *Kudumbashree Official Notice*\n\n📌 *${n.title}*\n🏛️ *Issued by*: ${n.issuingAuthority || "CDS"}\n${n.circularNo ? `🔖 *Ref*: ${n.circularNo}\n` : ""}\n${n.message}\n\n_Sent via K-Connect Official Portal_`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                          >
                            📲 Share Notice
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
              <h5 className="custom-modal-title text-white">🏛️ {isAdsOfficer && !isCdsOfficer ? "Write and Publish an ADS Notice" : "Write and Publish an ADS / CDS Notice"}</h5>
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
              <h5 className="custom-modal-title text-white">Cancel assigned task</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setCancelJob(null)} />
            </div>
            <form onSubmit={handleCancelJob}>
              <div className="custom-modal-body">
                <p>You are cancelling <strong>{cancelJob.taskName}</strong> in project <strong>{cancelJob.projectName || cancelJob.taskName}</strong>. Your Secretary will receive this reason and can reassign the work.</p>
                <label className="form-label fw-semibold">Reason for cancellation *</label>
                <textarea className="form-control" rows="4" minLength="5" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Please explain why you cannot take this task." required />
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setCancelJob(null)}>Keep task</button>
                <button type="submit" className="btn btn-danger">Send reason and cancel task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CDSNotifications;
