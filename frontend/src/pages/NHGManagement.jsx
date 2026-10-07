import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "../api";

const NHGManagement = () => {
  const { t, i18n } = useTranslation();
  const isMl = i18n.language === "ml";

  const [nhgs, setNhgs] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("nhgs"); // "nhgs" | "secretaries"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNhg, setEditingNhg] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    ward: "",
    panchayath: "Kudumbashree CDS",
    secretaryName: "",
    secretaryEmail: "",
    secretaryPhone: "",
    description: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [nhgsRes, statsRes, secRes] = await Promise.allSettled([
        api.get("/nhgs"),
        api.get("/nhgs/stats"),
        api.get("/nhgs/secretaries"),
      ]);

      if (nhgsRes.status === "fulfilled") {
        setNhgs(nhgsRes.value.data.nhgs || []);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
      if (secRes.status === "fulfilled") {
        setSecretaries(secRes.value.data.secretaries || []);
      }
    } catch (e) {
      console.error("Error loading NHG management data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.patch(`/nhgs/${id}/status`);
      setSuccessMsg(res.data?.message || "Status updated");
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete NHG '${name}'?`)) return;
    try {
      await api.delete(`/nhgs/${id}`);
      setSuccessMsg(`NHG '${name}' deleted successfully.`);
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete NHG");
    }
  };

  const openCreateModal = () => {
    setModalForm({
      name: "",
      ward: "15",
      panchayath: "Kudumbashree CDS",
      secretaryName: "",
      secretaryEmail: "",
      secretaryPhone: "",
      description: "",
    });
    setModalError("");
    setShowCreateModal(true);
  };

  const openEditModal = (nhg) => {
    setEditingNhg(nhg);
    setModalForm({
      name: nhg.name || "",
      ward: nhg.ward || "",
      panchayath: nhg.panchayath || "Kudumbashree CDS",
      secretaryName: nhg.secretaryName || "",
      secretaryEmail: nhg.secretaryEmail || "",
      secretaryPhone: nhg.secretaryPhone || "",
      description: nhg.description || "",
      status: nhg.status || "Active",
    });
    setModalError("");
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.post("/nhgs", modalForm);
      setShowCreateModal(false);
      setSuccessMsg(res.data?.message || "NHG created successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to create NHG");
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingNhg) return;
    setModalLoading(true);
    setModalError("");

    try {
      const res = await api.put(`/nhgs/${editingNhg._id}`, modalForm);
      setShowEditModal(false);
      setSuccessMsg(res.data?.message || "NHG updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to update NHG");
    } finally {
      setModalLoading(false);
    }
  };

  // Filter NHGs
  const filteredNhgs = nhgs.filter((nhg) => {
    const matchesSearch =
      searchTerm === "" ||
      nhg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nhg.ward?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nhg.secretaryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nhg.secretaryEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || nhg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="portal-page-container py-4">
      <div className="container">
        {/* BANNER */}
        <div
          className="card border-0 p-4 mb-4 text-white shadow-sm"
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: "20px",
          }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <span
                className="badge px-3 py-1 mb-2"
                style={{ background: "#3faf7a", color: "#ffffff", fontWeight: 700, fontSize: "11px" }}
              >
                🛡️ {isMl ? "സൂപ്പർ അഡ്മിൻ കൺസോൾ" : "SUPER ADMIN CONSOLE"}
              </span>
              <h2 className="fw-bolder mb-1">
                {isMl ? "മൾട്ടി-അയൽക്കൂട്ട മാനേജ്‌മെന്റ്" : "Multi-NHG Platform Governance"}
              </h2>
              <p className="text-white-50 small mb-0">
                {isMl
                  ? "സംസ്ഥാനത്തുടനീളമുള്ള കുടുംബശ്രീ അയൽക്കൂട്ടങ്ങൾ, സെക്രട്ടറിമാർ, ഫണ്ട് വിവരങ്ങൾ എന്നിവ നിരീക്ഷിക്കുക."
                  : "Platform-level oversight of registered NHG units, secretarial appointments, and collective data isolation."}
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm"
                style={{ background: "#3faf7a", borderColor: "#3faf7a" }}
                onClick={openCreateModal}
              >
                + {isMl ? "പുതിയ അയൽക്കൂട്ടം ചേർക്കുക" : "Create New NHG"}
              </button>
            </div>
          </div>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {successMsg && (
          <div className="alert alert-success alert-dismissible fade show py-2 small mb-4" role="alert">
            ✓ {successMsg}
          </div>
        )}

        {/* SYSTEM OVERVIEW STATS CARDS */}
        {stats && (
          <div className="row g-3 mb-4">
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Total NHGs</span>
                <h3 className="fw-bold mb-0 text-primary">{stats.totalNHGs || 0}</h3>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Active NHGs</span>
                <h3 className="fw-bold mb-0 text-success">{stats.activeNHGs || 0}</h3>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Secretaries</span>
                <h3 className="fw-bold mb-0 text-warning">{stats.totalSecretaries || 0}</h3>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Members</span>
                <h3 className="fw-bold mb-0 text-info">{stats.totalMembers || 0}</h3>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Thrift Fund</span>
                <h3 className="fw-bold mb-0 text-success" style={{ fontSize: "18px" }}>
                  ₹{(stats.totalThriftFund || 0).toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="col-md-2 col-sm-4 col-6">
              <div className="card p-3 border-0 shadow-sm text-center" style={{ borderRadius: "14px" }}>
                <span className="text-muted small">Loans Issued</span>
                <h3 className="fw-bold mb-0 text-primary" style={{ fontSize: "18px" }}>
                  ₹{(stats.totalLoansDisbursed || 0).toLocaleString()}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* TABS & SEARCH */}
        <div className="card border-0 shadow-sm p-4" style={{ borderRadius: "18px" }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3 pb-3 border-bottom">
            <ul className="nav nav-pills gap-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold px-4 py-2 rounded-pill ${activeTab === "nhgs" ? "active bg-success" : "text-dark"}`}
                  onClick={() => setActiveTab("nhgs")}
                >
                  🏛️ {isMl ? "അയൽക്കൂട്ടങ്ങൾ" : "NHG Units"} ({nhgs.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold px-4 py-2 rounded-pill ${activeTab === "secretaries" ? "active bg-success" : "text-dark"}`}
                  onClick={() => setActiveTab("secretaries")}
                >
                  👑 {isMl ? "സെക്രട്ടറിമാർ" : "NHG Secretaries"} ({secretaries.length})
                </button>
              </li>
            </ul>

            {activeTab === "nhgs" && (
              <div className="d-flex gap-2 flex-wrap">
                <input
                  type="text"
                  className="form-control form-control-sm rounded-pill px-3"
                  placeholder="Search NHG, ward, secretary..."
                  style={{ width: "240px" }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="form-select form-select-sm rounded-pill px-3"
                  style={{ width: "130px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: NHGs TABLE */}
          {activeTab === "nhgs" && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>NHG NAME</th>
                    <th>WARD</th>
                    <th>PANCHAYATH / CDS</th>
                    <th>ASSIGNED SECRETARY</th>
                    <th>STATUS</th>
                    <th className="text-end">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        Loading NHG directory...
                      </td>
                    </tr>
                  ) : filteredNhgs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No NHG records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredNhgs.map((nhg) => (
                      <tr key={nhg._id}>
                        <td>
                          <div className="fw-bold text-dark">{nhg.name}</div>
                          {nhg.description && (
                            <small className="text-muted d-block text-truncate" style={{ maxWidth: "240px" }}>
                              {nhg.description}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">Ward {nhg.ward || "15"}</span>
                        </td>
                        <td>
                          <span className="small text-muted">{nhg.panchayath || "Kudumbashree CDS"}</span>
                        </td>
                        <td>
                          {nhg.secretaryName || nhg.secretaryEmail ? (
                            <div>
                              <strong className="small text-dark d-block">
                                👑 {nhg.secretaryName || "Secretary"}
                              </strong>
                              <small className="text-muted">{nhg.secretaryEmail || "-"}</small>
                            </div>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle small">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge rounded-pill px-3 py-1 ${
                              nhg.status === "Active" ? "bg-success" : "bg-secondary"
                            }`}
                          >
                            {nhg.status || "Active"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className={`btn btn-outline-${nhg.status === "Active" ? "warning" : "success"}`}
                              onClick={() => handleToggleStatus(nhg._id)}
                              title={nhg.status === "Active" ? "Deactivate NHG" : "Activate NHG"}
                            >
                              {nhg.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => openEditModal(nhg)}
                              title="Edit NHG Details"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(nhg._id, nhg.name)}
                              title="Delete NHG"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SECRETARIES TABLE */}
          {activeTab === "secretaries" && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>SECRETARY NAME</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>ASSIGNED NHG</th>
                    <th>MEMBER SINCE</th>
                  </tr>
                </thead>
                <tbody>
                  {secretaries.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No registered NHG secretaries found.
                      </td>
                    </tr>
                  ) : (
                    secretaries.map((sec) => (
                      <tr key={sec._id}>
                        <td>
                          <strong className="text-dark">👑 {sec.name}</strong>
                        </td>
                        <td>
                          <span className="small text-muted">{sec.email}</span>
                        </td>
                        <td>
                          <span className="small text-muted">{sec.phone || "Not Provided"}</span>
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1">
                            {sec.nhgName || "Unassigned"}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {sec.createdAt ? new Date(sec.createdAt).toLocaleDateString() : "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NHG MODAL */}
      {showCreateModal && (
        <div className="kc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kc-modal-box" style={{ maxWidth: "520px" }}>
            <div className="kc-modal-header">
              <div className="kc-modal-icon-wrap">🏛️</div>
              <div>
                <h4 className="kc-modal-title">Create New NHG Unit</h4>
                <p className="kc-modal-desc">Register a new Neighborhood Group under Kudumbashree Mission</p>
              </div>
              <button type="button" className="kc-modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            {modalError && <div className="alert alert-danger py-2 small mb-3">{modalError}</div>}

            <form onSubmit={handleCreateSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold">NHG Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Surya Ayalkoottam"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Ward Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="15"
                    value={modalForm.ward}
                    onChange={(e) => setModalForm({ ...modalForm, ward: e.target.value })}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Panchayath / CDS</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalForm.panchayath}
                    onChange={(e) => setModalForm({ ...modalForm, panchayath: e.target.value })}
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Secretary Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Secretary full name"
                    value={modalForm.secretaryName}
                    onChange={(e) => setModalForm({ ...modalForm, secretaryName: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Secretary Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="secretary@example.com"
                    value={modalForm.secretaryEmail}
                    onChange={(e) => setModalForm({ ...modalForm, secretaryEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Description / Neighborhood Note</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Community details, location, activities..."
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success btn-sm px-4 fw-bold"
                  style={{ background: "#3faf7a", borderColor: "#3faf7a" }}
                  disabled={modalLoading}
                >
                  {modalLoading ? "Creating..." : "Save NHG Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NHG MODAL */}
      {showEditModal && editingNhg && (
        <div className="kc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kc-modal-box" style={{ maxWidth: "520px" }}>
            <div className="kc-modal-header">
              <div className="kc-modal-icon-wrap">✏️</div>
              <div>
                <h4 className="kc-modal-title">Edit NHG: {editingNhg.name}</h4>
                <p className="kc-modal-desc">Update neighborhood group information</p>
              </div>
              <button type="button" className="kc-modal-close" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>

            {modalError && <div className="alert alert-danger py-2 small mb-3">{modalError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold">NHG Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Ward Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalForm.ward}
                    onChange={(e) => setModalForm({ ...modalForm, ward: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Status</label>
                  <select
                    className="form-select"
                    value={modalForm.status}
                    onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Secretary Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalForm.secretaryName}
                    onChange={(e) => setModalForm({ ...modalForm, secretaryName: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Secretary Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={modalForm.secretaryEmail}
                    onChange={(e) => setModalForm({ ...modalForm, secretaryEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success btn-sm px-4 fw-bold"
                  style={{ background: "#3faf7a", borderColor: "#3faf7a" }}
                  disabled={modalLoading}
                >
                  {modalLoading ? "Saving..." : "Update NHG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NHGManagement;
