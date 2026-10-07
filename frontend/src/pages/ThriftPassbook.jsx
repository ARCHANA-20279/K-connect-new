import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "../portal.css";

const ThriftPassbook = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isSecretary = ["secretary", "nhg_secretary"].includes(role);
  const isMainAdmin = ["main_admin", "super_admin", "superadmin"].includes(role);
  const isMember = role === "member";

  const [data, setData] = useState({
    totalSavingsFund: 0,
    totalDepositsCount: 0,
    deposits: [],
    memberSummaries: [],
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isMember ? "passbook" : "register"); // 'register' | 'passbook'
  const [selectedMemberId, setSelectedMemberId] = useState(user?.memberId || "");
  const [memberPassbook, setMemberPassbook] = useState(null);

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    remarks: "",
  });

  // Passbook search term
  const [passbookFilter, setPassbookFilter] = useState("");

  // Fetch all thrift data & members
  const fetchData = async () => {
    try {
      setLoading(true);
      const [thriftRes, memberRes] = await Promise.all([
        api.get("/thrift"),
        api.get("/members"),
      ]);
      setData(thriftRes.data);
      const activeMembers = (memberRes.data.members || []).filter((m) => m.status === "Active");
      setMembers(activeMembers);

      // Auto-load member passbook if user is a member
      if (isMember) {
        setActiveTab("passbook");
        let targetId = user?.memberId;
        if (!targetId && activeMembers.length > 0) {
          const matched = activeMembers.find(
            (m) =>
              (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
              (m.phone && user?.phone && m.phone === user.phone) ||
              (m.name && user?.name && m.name.toLowerCase() === user.name.toLowerCase())
          );
          if (matched) targetId = matched.memberId;
        }
        if (targetId) {
          setSelectedMemberId(targetId);
          fetchPassbook(targetId);
        }
      }
    } catch (err) {
      console.error("Failed to load thrift data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch passbook when selected member changes
  const fetchPassbook = async (mId) => {
    if (!mId) return;
    try {
      const res = await api.get(`/thrift/passbook/${mId}`);
      setMemberPassbook(res.data);
    } catch (err) {
      console.error("Passbook error:", err);
    }
  };

  const handleSelectMemberPassbook = (mId) => {
    setSelectedMemberId(mId);
    fetchPassbook(mId);
    setActiveTab("passbook");
  };

  // Submit Thrift Deposit
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberId) {
      alert("Please select a member");
      return;
    }
    try {
      await api.post("/thrift", form);
      setShowDepositModal(false);
      setForm({
        memberId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paymentMode: "Cash",
        remarks: "",
      });
      fetchData();
      alert("Thrift deposit recorded successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record deposit");
    }
  };

  // Delete Thrift Deposit Entry (Secretary Only)
  const handleDeleteThrift = async (id, receiptNo) => {
    if (!window.confirm(`Are you sure you want to delete deposit receipt ${receiptNo}?`)) {
      return;
    }
    try {
      await api.delete(`/thrift/${id}`);
      await fetchData();
      if (selectedMemberId) {
        fetchPassbook(selectedMemberId);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete deposit record");
    }
  };

  return (
    <div className="portal-page-container">
      <div className="container">
        {/* HERO BANNER */}
        <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">Module 4 • {t("govtTagline")}</span>
            <h1 className="portal-hero-title">{t("thriftHeroTitle")}</h1>
            <p className="portal-hero-subtitle">
              {t("thriftHeroSubtitle")}
            </p>
          </div>
          <div>
            {isSecretary ? (
              <button
                className="btn btn-light fw-bold text-success px-4 py-2 shadow-sm"
                style={{ borderRadius: "12px" }}
                onClick={() => setShowDepositModal(true)}
              >
                {t("recordDepositBtn")}
              </button>
            ) : isMember ? (
              <span className="badge bg-light text-dark p-2 border">
                {t("memberViewBadge")}
              </span>
            ) : (
              <Link
                to="/login"
                className="btn btn-light fw-bold text-success px-4 py-2 shadow-sm"
                style={{ borderRadius: "12px" }}
              >
                🔒 {t("login")} (Secretary)
              </Link>
            )}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-emerald">💰</div>
              <div>
                <div className="portal-kpi-val text-success">
                  ₹{data.totalSavingsFund.toLocaleString()}
                </div>
                <div className="portal-kpi-lbl">{isMember
                  ? (i18n.language === "ml" ? "എന്റെ ആകെ സമ്പാദ്യം" : "My total savings")
                  : isMainAdmin
                  ? (i18n.language === "ml" ? "എല്ലാ NHG-കളിലെയും രേഖപ്പെടുത്തിയ നിക്ഷേപം" : "Recorded thrift across all NHGs")
                  : (i18n.language === "ml" ? "ഈ NHG-യിലെ രേഖപ്പെടുത്തിയ നിക്ഷേപം" : "Recorded thrift for this NHG")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-blue">🧾</div>
              <div>
                <div className="portal-kpi-val">{data.totalDepositsCount}</div>
                <div className="portal-kpi-lbl">{t("totalDepositsCount")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-amber">👥</div>
              <div>
                <div className="portal-kpi-val">{members.length}</div>
                <div className="portal-kpi-lbl">{t("kpiActiveMembers")}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-light border small mb-4">
          {isMember
            ? (i18n.language === "ml" ? "നിങ്ങളുടെ പാസ്ബുക്കിലെ രേഖപ്പെടുത്തിയ നിക്ഷേപങ്ങളുടെ ആകെ തുകയാണ് ഇവിടെ കാണിക്കുന്നത്." : "This is the sum of thrift deposits recorded in your personal passbook.")
            : isMainAdmin
            ? (i18n.language === "ml" ? "എല്ലാ NHG-കളിലെയും K-Connect-ൽ രേഖപ്പെടുത്തിയ നിക്ഷേപങ്ങളുടെ ആകെ തുക. പിൻവലിക്കലുകൾ ഇതിൽ നിന്ന് കുറച്ചിട്ടില്ല." : "Platform-wide sum of thrift deposits recorded in K-Connect. Withdrawals are not deducted.")
            : (i18n.language === "ml" ? "നിങ്ങളുടെ NHG-യിലെ K-Connect-ൽ രേഖപ്പെടുത്തിയ നിക്ഷേപങ്ങളുടെ ആകെ തുക. പിൻവലിക്കലുകൾ ഇതിൽ നിന്ന് കുറച്ചിട്ടില്ല." : "Sum of thrift deposits recorded for your NHG in K-Connect. Withdrawals are not deducted.")}
        </div>

        {/* TABS HEADER */}
        <div className="d-flex gap-2 mb-3">
          {(isSecretary || isMainAdmin) && (
          <button
            className={`btn btn-sm ${activeTab === "register" ? "btn-primary" : "btn-light border"}`}
            onClick={() => setActiveTab("register")}
          >
            📋 {t("weeklyRegisterTab")}
          </button>
          )}
          <button
            className={`btn btn-sm ${activeTab === "passbook" ? "btn-primary" : "btn-light border"}`}
            onClick={() => setActiveTab("passbook")}
          >
            📖 {t("passbookTab")}
          </button>
        </div>

        {/* TAB 1: COLLECTION REGISTER */}
        {activeTab === "register" && (
          <div className="portal-card">
            <div className="portal-card-header">
              <h5 className="portal-card-title">Recent Thrift Deposits</h5>
              <span className="badge bg-light text-dark border">
                Live Register ({data.deposits.length})
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading register...</div>
            ) : data.deposits.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <p className="mb-0">No thrift deposits recorded yet.</p>
                <small>Click "Record Thrift Deposit" to log weekly savings.</small>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="portal-table table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Collected By</th>
                      <th>Passbook</th>
                      {isSecretary && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.deposits.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            {item.receiptNumber}
                          </span>
                        </td>
                        <td>{item.date}</td>
                        <td>
                          <strong>{item.memberName}</strong>
                          <span className="text-muted small ms-1">({item.memberId})</span>
                        </td>
                        <td className="text-success fw-bold">₹{item.amount}</td>
                        <td>
                          <span className="badge bg-info-subtle text-info-emphasis border">
                            {item.paymentMode}
                          </span>
                        </td>
                        <td className="text-muted small">{item.collectedBy}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary py-0 px-2"
                            onClick={() => handleSelectMemberPassbook(item.memberId)}
                          >
                            View
                          </button>
                        </td>
                        {isSecretary && (
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger py-0 px-2"
                              title="Delete Record"
                              onClick={() => handleDeleteThrift(item._id, item.receiptNumber)}
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIGITAL PASSBOOK */}
        {activeTab === "passbook" && (
          <div className="portal-card">
            <div className="portal-card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h5 className="portal-card-title">📖 {t("myPassbookTitle") || "Digital Member Passbook"}</h5>
                <small className="text-muted">
                  Official digitized savings passbook for Kudumbashree Ayalkoottam members
                </small>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                {!isMember && <span className="small text-muted fw-semibold">Select Member:</span>}
                {!isMember && <select
                  className="form-select form-select-sm"
                  style={{ width: "240px" }}
                  value={selectedMemberId}
                  onChange={(e) => handleSelectMemberPassbook(e.target.value)}
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m.memberId}>
                      {m.name} ({m.memberId})
                    </option>
                  ))}
                </select>}

                {memberPassbook && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark fw-semibold d-flex align-items-center gap-1"
                    onClick={() => window.print()}
                    title="Print Passbook Statement"
                  >
                    <span>🖨️</span>
                    <span>{t("printPassbookStatement") || "Print Statement"}</span>
                  </button>
                )}
              </div>
            </div>

            {selectedMemberId && memberPassbook ? (
              <div>
                {/* OFFICIAL PASSBOOK PASS CARD (PRINTABLE) */}
                <div
                  className="card p-4 mb-4 border-0 shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #064e3b 0%, #0f766e 100%)",
                    color: "#ffffff",
                    borderRadius: "16px",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start border-bottom border-white border-opacity-25 pb-3 mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fs-4">🏛️</span>
                        <span className="fw-bold tracking-wide text-uppercase" style={{ fontSize: "12px", letterSpacing: "1px" }}>
                          Kudumbashree Mission • Kerala State Poverty Eradication
                        </span>
                      </div>
                      <h4 className="fw-bolder mb-0 text-white">
                        {memberPassbook.deposits[0]?.memberName ||
                          members.find((m) => m.memberId === memberPassbook.memberId)?.name ||
                          "NHG Member"}
                      </h4>
                      <small className="text-white-50">
                        Ward 15 Ayalkoottam • Member ID: <strong>{memberPassbook.memberId}</strong>
                      </small>
                    </div>

                    <div className="text-end">
                      <span className="badge bg-white text-success fw-bold px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: "11px" }}>
                        ✓ Active Thrift Account
                      </span>
                    </div>
                  </div>

                  <div className="row g-3 text-center text-md-start">
                    <div className="col-md-4 col-sm-6 border-end border-white border-opacity-25">
                      <small className="text-emerald-100 d-block text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                        Total Cumulative Savings
                      </small>
                      <strong className="display-6 fw-bold text-white">₹{memberPassbook.totalSaved.toLocaleString()}</strong>
                    </div>

                    <div className="col-md-4 col-sm-6 border-end border-white border-opacity-25">
                      <small className="text-emerald-100 d-block text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                        Weeks Contributed
                      </small>
                      <strong className="fs-3 fw-bold text-white">{memberPassbook.depositCount} Meetings</strong>
                    </div>

                    <div className="col-md-4 col-sm-12">
                      <small className="text-emerald-100 d-block text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                        Avg Weekly Thrift Rate
                      </small>
                      <strong className="fs-3 fw-bold text-white">
                        ₹{memberPassbook.depositCount > 0 ? Math.round(memberPassbook.totalSaved / memberPassbook.depositCount) : 0} / week
                      </strong>
                    </div>
                  </div>
                </div>

                {/* SEARCH & FILTER CONTROLS */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="input-group input-group-sm" style={{ maxWidth: "280px" }}>
                    <span className="input-group-text bg-white border-end-0">🔍</span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Filter by date or receipt #..."
                      value={passbookFilter}
                      onChange={(e) => setPassbookFilter(e.target.value)}
                    />
                  </div>
                  <span className="badge bg-light text-dark border small">
                    Showing{" "}
                    {
                      memberPassbook.deposits.filter(
                        (d) =>
                          !passbookFilter ||
                          d.receiptNumber.toLowerCase().includes(passbookFilter.toLowerCase()) ||
                          d.date.includes(passbookFilter) ||
                          d.remarks.toLowerCase().includes(passbookFilter.toLowerCase())
                      ).length
                    }{" "}
                    records
                  </span>
                </div>

                {/* PASSBOOK LEDGER TABLE */}
                <div className="table-responsive">
                  <table className="portal-table table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Deposit Date</th>
                        <th>Description / Purpose</th>
                        <th>Amount Deposited</th>
                        <th>Payment Mode</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberPassbook.deposits.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            No thrift deposits recorded for this member yet.
                          </td>
                        </tr>
                      ) : (
                        memberPassbook.deposits
                          .filter(
                            (d) =>
                              !passbookFilter ||
                              d.receiptNumber.toLowerCase().includes(passbookFilter.toLowerCase()) ||
                              d.date.includes(passbookFilter) ||
                              d.remarks.toLowerCase().includes(passbookFilter.toLowerCase())
                          )
                          .map((d) => (
                            <tr key={d._id}>
                              <td>
                                <code className="fw-bold text-primary">{d.receiptNumber}</code>
                              </td>
                              <td>{d.date}</td>
                              <td>{d.remarks || "Weekly Thrift Contribution"}</td>
                              <td className="text-success fw-bolder fs-6">+₹{d.amount.toLocaleString()}</td>
                              <td>
                                <span className="badge bg-light text-dark border">{d.paymentMode}</span>
                              </td>
                              <td className="text-muted small">{d.collectedBy || "Secretary"}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <span className="fs-1 d-block mb-2">💳</span>
                <p className="fw-semibold mb-1">Select a member profile above to load the digital passbook.</p>
                <small>{isMember ? "Your secretary's recorded deposits will appear here." : "Choose a member to view recorded savings."}</small>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECORD DEPOSIT MODAL (SECRETARY EXCLUSIVE) */}
      {showDepositModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-primary text-white">
              <h5 className="custom-modal-title text-white">💳 Record Weekly Thrift Deposit</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowDepositModal(false)}
              ></button>
            </div>
            <form onSubmit={handleDepositSubmit}>
              <div className="custom-modal-body">
                <div className="form-group-item">
                  <label className="form-group-label">Select NHG Member *</label>
                  <select
                    className="form-control-input"
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m._id} value={m.memberId}>
                        {m.name} ({m.memberId}) - Ward {m.ward}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <div className="col-6 form-group-item">
                    <label className="form-group-label">Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-control-input"
                      placeholder="e.g. 50 or 100"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="col-6 form-group-item">
                    <label className="form-group-label">Date *</label>
                    <input
                      type="date"
                      className="form-control-input"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Payment Mode</label>
                  <select
                    className="form-control-input"
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                  >
                    <option value="Cash">Cash (Collected at Meeting)</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Bank">Direct Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label className="form-group-label">Remarks</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="e.g. Weekly Savings (Optional)"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success fw-bold px-3">
                  ✓ Record & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThriftPassbook;
