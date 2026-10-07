import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const KERALA_DISTRICTS = [
  "Kannur",
  "Kozhikode",
  "Ernakulam",
  "Thiruvananthapuram",
  "Thrissur",
  "Malappuram",
  "Kollam",
  "Palakkad",
  "Alappuzha",
  "Kottayam",
  "Kasaragod",
  "Pathanamthitta",
  "Idukki",
  "Wayanad",
];

const NHGRegister = () => {
  const [formData, setFormData] = useState({
    nhgName: "",
    district: "Kannur",
    localBodyType: "Grama Panchayat",
    localBodyName: "",
    wardNumber: "",
    cdsName: "",
    adsName: "",
    presidentName: "",
    secretaryName: "",
    secretaryMobileNumber: "",
    secretaryEmail: "",
    numberOfMembers: 15,
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/nhgs/register", formData);
      setSubmittedData(res.data?.nhg || formData);
    } catch (err) {
      console.error("NHG registration failed:", err);
      setError(err.response?.data?.message || "Failed to submit NHG registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "85vh", padding: "40px 16px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header Breadcrumb */}
        <div className="mb-4">
          <Link to="/" style={{ color: "#0f766e", textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>
            ← Back to Home
          </Link>
          <div className="d-flex align-items-center gap-2 mt-2">
            <span style={{ fontSize: "28px" }}>🌱</span>
            <h2 className="fw-bold mb-0" style={{ color: "#0f766e" }}>
              Register Your Kudumbashree NHG
            </h2>
          </div>
          <p className="text-muted mt-1" style={{ fontSize: "15px" }}>
            Register your Neighbourhood Group (Ayalkoottam) on the K-Connect digital platform.
            Once approved by the Main Admin, your Secretary can log in to manage members, savings, loans, and meetings.
          </p>
        </div>

        {/* Success View */}
        {submittedData ? (
          <div
            className="card border-0 shadow-sm p-4 p-md-5 text-center"
            style={{ borderRadius: "16px", backgroundColor: "#ffffff" }}
          >
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
              style={{ width: "72px", height: "72px", backgroundColor: "#ecfdf5", color: "#059669", fontSize: "36px" }}
            >
              ✓
            </div>

            <h3 className="fw-bold" style={{ color: "#065f46" }}>
              Application Submitted!
            </h3>

            <div
              className="alert alert-success py-3 px-4 my-3 text-start mx-auto"
              style={{ maxWidth: "600px", borderRadius: "12px", border: "1px solid #a7f3d0", backgroundColor: "#f0fdf4" }}
            >
              <div className="fw-bold text-success mb-1" style={{ fontSize: "16px" }}>
                NHG registration submitted successfully. Your application is waiting for admin verification.
              </div>
              <p className="text-muted small mb-0">
                The Main Admin will review your NHG credentials. Upon approval, you can sign in using your Secretary email: <strong>{submittedData.secretaryEmail}</strong>.
              </p>
            </div>

            <div
              className="p-3 my-2 text-start mx-auto bg-light rounded-3"
              style={{ maxWidth: "600px", border: "1px solid #e2e8f0" }}
            >
              <h6 className="fw-bold text-dark mb-2">Registration Summary:</h6>
              <div className="row g-2 small">
                <div className="col-sm-6">
                  <strong>NHG Name:</strong> {submittedData.name || submittedData.nhgName}
                </div>
                <div className="col-sm-6">
                  <strong>Assigned NHG ID:</strong> <span className="badge bg-secondary font-monospace">{submittedData.nhgId || "Generated on Approval"}</span>
                </div>
                <div className="col-sm-6">
                  <strong>Local Body:</strong> {submittedData.localBodyName} ({submittedData.localBodyType})
                </div>
                <div className="col-sm-6">
                  <strong>Ward Number:</strong> Ward {submittedData.ward || submittedData.wardNumber}
                </div>
                <div className="col-sm-6">
                  <strong>Secretary:</strong> {submittedData.secretaryName} ({submittedData.secretaryPhone || submittedData.secretaryMobileNumber})
                </div>
                <div className="col-sm-6">
                  <strong>Verification Status:</strong> <span className="badge bg-warning text-dark">Pending Admin Verification</span>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3 mt-4">
              <Link
                to="/"
                className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-semibold"
              >
                Return to Home
              </Link>
              <Link
                to="/login"
                className="btn px-4 py-2 rounded-pill fw-semibold text-white"
                style={{ backgroundColor: "#0f766e" }}
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          /* Form Card */
          <div
            className="card border-0 shadow-sm p-4 p-md-5"
            style={{ borderRadius: "16px", backgroundColor: "#ffffff" }}
          >
            {error && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* SECTION 1: NHG BASIC DETAILS */}
              <div className="mb-4">
                <h5 className="fw-bold pb-2 border-bottom" style={{ color: "#0f766e", fontSize: "16px" }}>
                  1. Neighbourhood Group (NHG) Details
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      NHG Name *
                    </label>
                    <input
                      type="text"
                      name="nhgName"
                      className="form-control"
                      placeholder="e.g. Deepam NHG, Sneha NHG, Jyothi NHG"
                      value={formData.nhgName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      District *
                    </label>
                    <select
                      name="district"
                      className="form-select"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    >
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-dark">
                      Local Body Type *
                    </label>
                    <select
                      name="localBodyType"
                      className="form-select"
                      value={formData.localBodyType}
                      onChange={handleChange}
                      required
                    >
                      <option value="Grama Panchayat">Grama Panchayat</option>
                      <option value="Municipality">Municipality</option>
                      <option value="Corporation">Corporation</option>
                    </select>
                  </div>

                  <div className="col-md-5">
                    <label className="form-label small fw-semibold text-dark">
                      Local Body Name *
                    </label>
                    <input
                      type="text"
                      name="localBodyName"
                      className="form-control"
                      placeholder="e.g. Pariyaram Grama Panchayat"
                      value={formData.localBodyName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-dark">
                      Ward Number *
                    </label>
                    <input
                      type="text"
                      name="wardNumber"
                      className="form-control"
                      placeholder="e.g. 15"
                      value={formData.wardNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      CDS Name *
                    </label>
                    <input
                      type="text"
                      name="cdsName"
                      className="form-control"
                      placeholder="e.g. Pariyaram CDS"
                      value={formData.cdsName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      ADS Name *
                    </label>
                    <input
                      type="text"
                      name="adsName"
                      className="form-control"
                      placeholder="e.g. Ward 15 ADS"
                      value={formData.adsName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: LEADERSHIP & SECRETARY CREDENTIALS */}
              <div className="mb-4">
                <h5 className="fw-bold pb-2 border-bottom" style={{ color: "#0f766e", fontSize: "16px" }}>
                  2. Leadership & Secretary Account Details
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      President Name *
                    </label>
                    <input
                      type="text"
                      name="presidentName"
                      className="form-control"
                      placeholder="e.g. Bindu Rajesh"
                      value={formData.presidentName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Secretary Name *
                    </label>
                    <input
                      type="text"
                      name="secretaryName"
                      className="form-control"
                      placeholder="e.g. Archana M"
                      value={formData.secretaryName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Secretary Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="secretaryMobileNumber"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={formData.secretaryMobileNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Secretary Email Address * (Used for Login)
                    </label>
                    <input
                      type="email"
                      name="secretaryEmail"
                      className="form-control"
                      placeholder="secretary@example.com"
                      value={formData.secretaryEmail}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Create Password for Login *
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      You will use this password once Admin approves your NHG.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Number of Members *
                    </label>
                    <input
                      type="number"
                      name="numberOfMembers"
                      className="form-control"
                      min={5}
                      max={50}
                      value={formData.numberOfMembers}
                      onChange={handleChange}
                      required
                    />
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      Individual members can be added after Admin verification.
                    </small>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div
                className="p-3 mb-4 rounded-3"
                style={{ backgroundColor: "#f0fdf4", border: "1px dashed #059669" }}
              >
                <div className="d-flex align-items-center gap-2 text-success fw-bold small">
                  <span>ℹ️</span>
                  <span>Notice for NHG Office Bearers:</span>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  Upon registration submission, your NHG will be marked as <strong>Pending</strong>.
                  The Main Admin will verify the registration before activating your login access.
                </p>
              </div>

              {/* Submit Button */}
              <div className="d-flex justify-content-end gap-3 align-items-center">
                <Link to="/" className="btn btn-outline-secondary px-4 py-2 rounded-pill">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn px-5 py-2 rounded-pill fw-bold text-white shadow-sm"
                  style={{ backgroundColor: "#0f766e" }}
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit NHG Registration →"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default NHGRegister;
