import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const AuditManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSecretary = user?.role === "secretary";
  const isMember = user?.role === "member";

  const [summary, setSummary] = useState({
    financialYear: "2025-2026",
    totalThriftReceipts: 0,
    totalLoanDisbursements: 0,
    totalLoanRepayments: 0,
    cashInHand: 0,
    bankBalance: 0,
  });
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    financialYear: "2025-2026",
    auditDate: new Date().toISOString().split("T")[0],
    auditorName: "CDS Internal Audit Committee",
    remarks: "All thrift passbooks, micro-loan ledgers, and attendance registers have been verified and reconciled according to Kudumbashree State Mission standards.",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, auditsRes] = await Promise.all([
        api.get("/audit/summary"),
        api.get("/audit"),
      ]);
      setSummary(sumRes.data);
      setAudits(auditsRes.data.audits || []);
    } catch (err) {
      console.error("Failed to load audit data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/audit", {
        ...form,
        totalThriftReceipts: summary.totalThriftReceipts,
        totalLoanDisbursements: summary.totalLoanDisbursements,
        totalLoanRepayments: summary.totalLoanRepayments,
        cashInHand: summary.cashInHand,
        bankBalance: summary.bankBalance,
        status: "Certified",
        verifiedBy: user?.name || "Secretary",
      });
      setShowModal(false);
      fetchData();
      alert("Annual Audit statement certified and published successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to certify audit statement");
    }
  };

  return (
    <div className="portal-page-container">
      <div className="container">
        {/* HERO BANNER */}
        <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">Module 9 • {t("govtTagline")}</span>
            <h1 className="portal-hero-title">{t("auditHeroTitle")}</h1>
            <p className="portal-hero-subtitle">
              {t("auditHeroSubtitle")}
            </p>
          </div>
          <div>
            {isSecretary ? (
              <button
                className="btn btn-light fw-bold text-success px-4 py-2 shadow-sm"
                style={{ borderRadius: "12px" }}
                onClick={() => setShowModal(true)}
              >
                {t("generateAuditBtn")}
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

        {/* FINANCIAL RECONCILIATION SUMMARY */}
        <div className="portal-card mb-4">
          <div className="portal-card-header">
            <h5 className="portal-card-title">
              📊 Real-Time Financial Statement ({summary.financialYear})
            </h5>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
              ✓ {t("certifiedBadge")}
            </span>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <span className="text-muted small d-block mb-1">{t("totalReceiptsLabel")} (Thrift)</span>
                <h3 className="fw-bold text-success mb-0">₹{summary.totalThriftReceipts.toLocaleString()}</h3>
                <small className="text-muted">Weekly member savings</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <span className="text-muted small d-block mb-1">Total Loan Repayments Received</span>
                <h3 className="fw-bold text-primary mb-0">₹{summary.totalLoanRepayments.toLocaleString()}</h3>
                <small className="text-muted">Principal & recovery receipts</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <span className="text-muted small d-block mb-1">{t("totalPaymentsLabel")} (Loans Disbursed)</span>
                <h3 className="fw-bold text-warning text-dark mb-0">₹{summary.totalLoanDisbursements.toLocaleString()}</h3>
                <small className="text-muted">Micro-loans sanctioned to members</small>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-4 bg-primary-subtle rounded-3 border border-primary-subtle">
                <span className="text-primary fw-semibold small d-block mb-1">🏦 {t("bankBalanceLabel")}</span>
                <h2 className="fw-bold text-primary mb-0">₹{summary.bankBalance.toLocaleString()}</h2>
                <small className="text-muted">Official Kudumbashree NHG Bank Account</small>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-4 bg-success-subtle rounded-3 border border-success-subtle">
                <span className="text-success fw-semibold small d-block mb-1">💵 {t("cashInHandLabel")}</span>
                <h2 className="fw-bold text-success mb-0">₹{summary.cashInHand.toLocaleString()}</h2>
                <small className="text-muted">Liquid petty balance held by Secretary</small>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIT HISTORY & CERTIFIED STATEMENTS */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h5 className="portal-card-title">
              📜 Certified Annual Audit Records
            </h5>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => window.print()}
            >
              🖨️ Print Audit Statement
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">{t("loading")}</div>
          ) : audits.length === 0 ? (
            <div className="text-center text-muted py-5">
              <h5>No certified audit statements saved yet</h5>
              <p className="small mb-0">Click "Generate Audit Statement" above to certify today's financial ledger.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="portal-table table">
                <thead>
                  <tr>
                    <th>{t("financialYear")}</th>
                    <th>{t("date")}</th>
                    <th>{t("totalReceiptsLabel")}</th>
                    <th>{t("totalPaymentsLabel")}</th>
                    <th>{t("bankBalanceLabel")}</th>
                    <th>{t("cashInHandLabel")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a._id}>
                      <td className="fw-bold text-primary">{a.financialYear}</td>
                      <td>{a.auditDate}</td>
                      <td className="text-success fw-semibold">₹{Number(a.totalThriftReceipts + a.totalLoanRepayments).toLocaleString()}</td>
                      <td className="text-danger fw-semibold">₹{Number(a.totalLoanDisbursements).toLocaleString()}</td>
                      <td className="fw-bold">₹{Number(a.bankBalance).toLocaleString()}</td>
                      <td className="fw-bold">₹{Number(a.cashInHand).toLocaleString()}</td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                          ✓ {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE AUDIT MODAL */}
      {showModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header">
              <h5 className="custom-modal-title">📑 {t("generateAuditBtn")}</h5>
              <button className="btn-close" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleGenerateSubmit}>
              <div className="custom-modal-body">
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <span className="small text-muted d-block">Reconciled Summary for Certification:</span>
                  <div className="row g-2 mt-1">
                    <div className="col-6 small">
                      <strong>Thrift Receipts:</strong> ₹{summary.totalThriftReceipts.toLocaleString()}
                    </div>
                    <div className="col-6 small">
                      <strong>Repayments:</strong> ₹{summary.totalLoanRepayments.toLocaleString()}
                    </div>
                    <div className="col-6 small">
                      <strong>Disbursements:</strong> ₹{summary.totalLoanDisbursements.toLocaleString()}
                    </div>
                    <div className="col-6 small">
                      <strong>Net Balance:</strong> ₹{(summary.bankBalance + summary.cashInHand).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("financialYear")}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.financialYear}
                      onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t("date")}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.auditDate}
                      onChange={(e) => setForm({ ...form, auditDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Auditor Committee / CDS Officer</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.auditorName}
                    onChange={(e) => setForm({ ...form, auditorName: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">{t("auditorRemarks")}</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-success fw-semibold">
                  ✓ Certify & Save Statement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditManagement;
