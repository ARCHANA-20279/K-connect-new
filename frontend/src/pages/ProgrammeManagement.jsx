import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const ProgrammeManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSecretary = user?.role === "secretary";
  const isMember = user?.role === "member";

  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Women Empowerment",
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    venue: "Community Hall",
    coordinator: user?.name || "Secretary",
    budget: "5000",
    description: "",
  });

  const fetchProgrammes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/programmes");
      setProgrammes(res.data.programmes || []);
    } catch (err) {
      console.error("Failed to load programmes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/programmes", {
        ...form,
        budget: Number(form.budget) || 0,
      });
      setShowModal(false);
      setForm({
        title: "",
        category: "Women Empowerment",
        date: new Date().toISOString().split("T")[0],
        time: "10:00 AM",
        venue: "Community Hall",
        coordinator: user?.name || "Secretary",
        budget: "5000",
        description: "",
      });
      fetchProgrammes();
      alert("Programme scheduled successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to schedule programme");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/programmes/${id}`, { status });
      fetchProgrammes();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this programme?")) return;
    try {
      await api.delete(`/programmes/${id}`);
      fetchProgrammes();
    } catch (err) {
      alert("Failed to delete programme");
    }
  };

  const totalBudget = programmes.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  return (
    <div className="portal-page-container">
      <div className="container">
        {/* HERO BANNER */}
        <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">Module 7 • {t("govtTagline")}</span>
            <h1 className="portal-hero-title">{t("programmesHeroTitle")}</h1>
            <p className="portal-hero-subtitle">
              {t("programmesHeroSubtitle")}
            </p>
          </div>
          <div>
            {isSecretary ? (
              <button
                className="btn btn-light fw-bold text-primary px-4 py-2 shadow-sm"
                style={{ borderRadius: "12px" }}
                onClick={() => setShowModal(true)}
              >
                {t("scheduleProgrammeBtn")}
              </button>
            ) : isMember ? (
              <span className="badge bg-light text-primary p-2 border">
                {t("memberViewBadge")}
              </span>
            ) : (
              <Link to="/login" className="btn btn-light fw-bold px-3 py-2 shadow-sm">
                🔒 {t("login")} (Secretary)
              </Link>
            )}
          </div>
        </div>

        {/* KPI STATS ROW */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-purple">🌟</div>
              <div>
                <div className="portal-kpi-val">{programmes.length}</div>
                <div className="portal-kpi-lbl">Total Programmes Scheduled</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-emerald">💰</div>
              <div>
                <div className="portal-kpi-val text-success">₹{totalBudget.toLocaleString()}</div>
                <div className="portal-kpi-lbl">Total Allocated Community Budget</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-blue">🤝</div>
              <div>
                <div className="portal-kpi-val">
                  {programmes.filter((p) => p.status === "Ongoing" || p.status === "Planned").length}
                </div>
                <div className="portal-kpi-lbl">Active & Upcoming Initiatives</div>
              </div>
            </div>
          </div>
        </div>

        {/* PROGRAMMES GRID */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h5 className="portal-card-title">
              📅 {t("programmesHeroTitle")}
            </h5>
            <span className="badge bg-light text-dark border">
              {programmes.length} {t("all")}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-4">{t("loading")}</div>
          ) : programmes.length === 0 ? (
            <div className="text-center text-muted py-5">
              <h5>No community programmes scheduled yet</h5>
              <p className="small mb-0">Programmes scheduled by the Secretary will appear here.</p>
            </div>
          ) : (
            <div className="row g-3">
              {programmes.map((prog) => (
                <div className="col-md-6 col-lg-4" key={prog._id}>
                  <div className="card h-100 p-3 border rounded-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                        {prog.category}
                      </span>
                      <span
                        className={`badge ${
                          prog.status === "Completed"
                            ? "bg-success"
                            : prog.status === "Ongoing"
                            ? "bg-warning text-dark"
                            : "bg-info text-dark"
                        }`}
                      >
                        {prog.status}
                      </span>
                    </div>

                    <h5 className="fw-bold text-dark mb-2">{prog.title}</h5>

                    <div className="small text-muted mb-1">
                      📅 <strong>{t("date")}:</strong> {prog.date} • {prog.time}
                    </div>
                    <div className="small text-muted mb-1">
                      📍 <strong>{t("venue")}:</strong> {prog.venue}
                    </div>
                    <div className="small text-muted mb-1">
                      👤 <strong>{t("coordinatorLabel")}:</strong> {prog.coordinator}
                    </div>
                    <div className="small text-muted mb-2">
                      💰 <strong>{t("budgetLabel")}:</strong> ₹{Number(prog.budget).toLocaleString()}
                    </div>

                    {prog.description && (
                      <p className="small bg-light p-2 rounded text-secondary mb-3">
                        {prog.description}
                      </p>
                    )}

                    {isSecretary && (
                      <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                        <select
                          className="form-select form-select-sm w-auto"
                          value={prog.status}
                          onChange={(e) => handleStatusChange(prog._id, e.target.value)}
                        >
                          <option value="Planned">Planned</option>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Completed">Completed</option>
                          <option value="Postponed">Postponed</option>
                        </select>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(prog._id)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SCHEDULE MODAL (SECRETARY ONLY) */}
      {showModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">🌟 {t("scheduleProgrammeBtn")}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="custom-modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("programmeTitleLabel")} *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Haritha Karma Sena Waste Segregation Drive"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("categoryLabel")}</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Women Empowerment">Women Empowerment</option>
                    <option value="Skill Training">Skill Training & Workshop</option>
                    <option value="Community Health">Community Health & Sanitation</option>
                    <option value="Micro-Enterprise">Micro-Enterprise / Farming</option>
                    <option value="Environmental Drive">Haritha Karma Sena / Eco Drive</option>
                  </select>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("date")} *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("time")} *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("venue")} *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ward 15 Community Center"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    required
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("coordinatorLabel")}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.coordinator}
                      onChange={(e) => setForm({ ...form, coordinator: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("budgetLabel")}</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("remarks")}</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Brief description of the initiative..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary fw-semibold">
                  {t("submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgrammeManagement;
