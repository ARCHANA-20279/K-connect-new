import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Role checks
  const rawRole = (user?.role || "").toLowerCase();
  const normalizedRole = rawRole.replace(/[-_]/g, "");
  const isMainAdmin =
    rawRole === "main_admin" ||
    rawRole === "super_admin" ||
    rawRole === "superadmin";
  const isSecretary = normalizedRole === "nhgsecretary" || normalizedRole === "secretary";
  const isMember = normalizedRole === "member";
  const isBankOfficer = normalizedRole === "bankofficer";
  const isLoanReviewer = ["adsofficer", "cdsofficer", "adscdsofficer", "bankofficer"].includes(normalizedRole);
  const isAdsOfficer = ["adsofficer", "adscdsofficer"].includes(normalizedRole);
  const isCdsOfficer = ["cdsofficer", "adscdsofficer"].includes(normalizedRole);

  const [showQrModal, setShowQrModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg sticky-top bg-white py-2 px-3 px-lg-4"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div className="container-fluid px-0">
        {/* BRAND LOGO - Matching image */}
        <Link
          className="navbar-brand d-flex align-items-center gap-2 text-decoration-none"
          to={user ? "/dashboard" : "/"}
        >
          {/* Flower sprout logo icon */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              border: "1px solid #a7f3d0",
            }}
          >
            🌱
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span
                className="fw-bold"
                style={{
                  fontSize: "20px",
                  color: "#0f766e",
                  letterSpacing: "-0.5px",
                }}
              >
                K-Connect
              </span>
            </div>
            <small
              className="d-block text-muted"
              style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1 }}
            >
              {isMainAdmin
                ? "Central Admin Console"
                : user?.nhgName
                ? `${user.nhgName} ${user.nhgId ? `(${user.nhgId})` : ""}`
                : "Kudumbashree NHG Platform"}
            </small>
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* NAVIGATION CONTENT */}
        <div
          className={`collapse navbar-collapse ${mobileMenuOpen ? "show" : ""}`}
        >
          {/* If NOT LOGGED IN: Simple Public Menu */}
          {!user ? (
            <>
              <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-1 gap-lg-2">
                <li className="nav-item">
                  <Link
                    to="/"
                    className={`nav-link px-3 py-1 fw-semibold ${
                      isActive("/") ? "active-public-nav" : "text-dark"
                    }`}
                    style={
                      isActive("/")
                        ? {
                            backgroundColor: "#d1fae5",
                            color: "#065f46",
                            borderRadius: "20px",
                          }
                        : {}
                    }
                  >
                    Home
                  </Link>
                </li>

                {isLoanReviewer && <li className="nav-item">
                  <Link
                    to="/loans"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}
                  >
                    💰 {i18n.resolvedLanguage === "ml" || i18n.language === "ml" ? "വായ്പകൾ" : "Loans"}
                  </Link>
                </li>}
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#about">
                    About
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#services">
                    Services
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#notices">
                    Notices
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#contact">
                    Contact
                  </a>
                </li>
              </ul>

              {/* Login and Register Buttons (Matching Image) */}
              <div className="d-flex align-items-center gap-2">
                <Link
                  to="/login"
                  className="btn btn-sm px-3 py-1 rounded-pill fw-semibold"
                  style={{
                    border: "1px solid #cbd5e1",
                    color: "#0f766e",
                    backgroundColor: "#ffffff",
                  }}
                >
                  👤 Login
                </Link>
                <Link
                  to="/register-nhg"
                  className="btn btn-sm px-3 py-1 rounded-pill fw-semibold text-white shadow-sm"
                  style={{
                    backgroundColor: "#0f766e",
                    border: "1px solid #0f766e",
                  }}
                >
                  👥 Register NHG
                </Link>
              </div>
            </>
          ) : (
            /* IF LOGGED IN: Contextual Navigation Links */
            <>
              <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
                {/* 1. Dashboard (All roles) */}
                <li className="nav-item">
                  <Link
                    to="/dashboard"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                      isActive("/dashboard") ? "active-role-nav" : "text-dark"
                    }`}
                  >
                    📊 Dashboard
                  </Link>
                </li>

                <li className="nav-item">
                  <Link
                    to="/learning"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                      isActive("/learning") ? "active-role-nav" : "text-dark"
                    }`}
                  >
                    📚 {i18n.resolvedLanguage === "ml" || i18n.language === "ml" ? "പഠനം" : "Learning"}
                  </Link>
                </li>

                {/* 2. MAIN ADMIN LINKS */}
                {isMainAdmin && (
                  <>
                    <li className="nav-item">
                      <Link
                        to="/nhg-management"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/nhg-management")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        🏛️ NHGs & Registrations
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/members"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/members") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        👥 Members
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/attendance"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/attendance")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📱 Attendance
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 Loans
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 Savings
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/circulars"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/circulars")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📢 Notices
                      </Link>
                    </li>
                  </>
                )}

                {/* 3. NHG SECRETARY LINKS (Bounded to own NHG) */}
                {isSecretary && (
                  <>
                    <li className="nav-item">
                      <Link
                        to="/members"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/members") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        👥 Members
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/attendance"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/attendance")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📱 Meeting Attendance
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/meetings"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/meetings")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📅 Meetings
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 Savings / Passbook
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 Loans
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/jobs" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/jobs") ? "active-role-nav" : "text-dark"}`}>
                        💼 Community Jobs
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/circulars"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/circulars")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📢 Notices
                      </Link>
                    </li>
                  </>
                )}

                {/* 4. MEMBER LINKS */}
                {isLoanReviewer && (
                  <>
                    {isBankOfficer && <li className="nav-item">
                      <Link to="/loans" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}>
                        🏦 {i18n.resolvedLanguage === "ml" || i18n.language === "ml" ? "ഡെമോ ബാങ്ക് പരിശോധന" : "Demo Bank Review"}
                      </Link>
                    </li>}
                    {isAdsOfficer && <li className="nav-item">
                      <Link
                        to="/ads"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/ads") ? "active-role-nav" : "text-dark"}`}
                      >
                        🏛️ ADS Loan Desk
                      </Link>
                    </li>}
                    {isCdsOfficer && <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}
                      >
                        🏦 CDS Loan Review
                      </Link>
                    </li>}
                    <li className="nav-item">
                      <Link
                        to="/circulars"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/circulars") ? "active-role-nav" : "text-dark"}`}
                      >
                        📢 Notices
                      </Link>
                    </li>
                  </>
                )}

                {/* 5. MEMBER LINKS */}
                {isMember && (
                  <>
                    <li className="nav-item">
                      <Link
                        to="/attendance"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/attendance")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📱 Scan QR Attendance
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 My Passbook
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 My Loans
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/jobs" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/jobs") ? "active-role-nav" : "text-dark"}`}>
                        💼 My Jobs
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/circulars"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/circulars")
                            ? "active-role-nav"
                            : "text-dark"
                        }`}
                      >
                        📢 Notices
                      </Link>
                    </li>
                  </>
                )}
              </ul>

              {/* Right Profile & Logout */}
              <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
                {isMember && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success rounded-pill px-3 py-1"
                    onClick={() => setShowQrModal(true)}
                  >
                    📱 My QR ID
                  </button>
                )}

                <div
                  className="px-3 py-1 rounded-pill small border"
                  style={{
                    backgroundColor: isMainAdmin
                      ? "#f1f5f9"
                      : isSecretary
                      ? "#ecfdf5"
                      : "#eff6ff",
                    color: isMainAdmin
                      ? "#334155"
                      : isSecretary
                      ? "#065f46"
                      : "#1e40af",
                    borderColor: "#cbd5e1",
                    fontWeight: 600,
                  }}
                >
                  {isMainAdmin ? "🛡️ Main Admin" : isSecretary ? `👑 ${user.nhgName || "Secretary"}` : `👤 ${user.name}`}
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MEMBER QR MODAL */}
      {showQrModal && user && (
        <div className="custom-modal-backdrop" style={{ zIndex: 1100 }}>
          <div
            className="custom-modal-card text-center"
            style={{ maxWidth: "400px" }}
          >
            <div className="custom-modal-header bg-success text-white py-2 px-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white fw-bold">
                📱 My Attendance QR Card
              </h6>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowQrModal(false)}
              ></button>
            </div>
            <div className="p-4 bg-white">
              <div
                className="p-3 rounded-3 mb-3 bg-light"
                style={{ border: "2px dashed #059669" }}
              >
                <QRCodeCanvas
                  value={user.memberId || user.qrCode || "KC00001"}
                  size={180}
                  level="H"
                />
                <div className="mt-3">
                  <h6 className="fw-bold mb-0 text-dark">{user.name}</h6>
                  <span className="badge bg-dark font-monospace my-1">
                    ID: {user.memberId || user.qrCode || "KC00001"}
                  </span>
                  <small className="text-muted d-block">
                    {user.nhgName || "Kudumbashree NHG"}
                  </small>
                </div>
              </div>
              <p className="small text-muted mb-0">
                Show this QR card or scan the Secretary's Meeting QR during roll-call.
              </p>
            </div>
            <div className="p-3 bg-light text-end">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowQrModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .active-role-nav {
          background-color: #ecfdf5 !important;
          color: #0f766e !important;
        }
        .active-public-nav {
          background-color: #d1fae5 !important;
          color: #065f46 !important;
        }
        .hover-white:hover {
          color: #ffffff !important;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
