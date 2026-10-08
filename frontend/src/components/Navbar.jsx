import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const isMl = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      className={`navbar navbar-expand-xl bg-white py-2 px-3 px-lg-4 kc-main-navbar ${user ? "kc-sidebar-navbar" : "kc-public-navbar"}`}
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div className="container-fluid px-0">
        {/* K-Connect Kudumbashree brand mark */}
        <Link
          className="navbar-brand d-flex align-items-center gap-2 text-decoration-none kc-navbar-brand"
          to={user ? "/dashboard" : "/"}
        >
          <img className="kc-navbar-logo" src="/k-connect-logo.svg" alt="K-Connect — Kudumbashree NHG Platform" />
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
                            backgroundColor: "#e3f1f3",
                            color: "#1a5965",
                            borderRadius: "20px",
                          }
                        : {}
                    }
                  >
                    {isMl ? "ഹോം" : "Home"}
                  </Link>
                </li>

                {isLoanReviewer && <li className="nav-item">
                  <Link
                    to="/loans"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}
                  >
                    💰 {t("navLoans")}
                  </Link>
                </li>}
                <li className="nav-item">
                  <Link className={`nav-link px-3 py-1 fw-semibold ${isActive("/about") ? "active-public-nav" : "text-dark"}`} to="/about">
                    {isMl ? "ഞങ്ങളെക്കുറിച്ച്" : "About"}
                  </Link>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#services">
                    {isMl ? "സേവനങ്ങൾ" : "Services"}
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#notices">
                    {isMl ? "അറിയിപ്പുകൾ" : "Notices"}
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link px-3 py-1 text-dark" href="#contact">
                    {isMl ? "ബന്ധപ്പെടുക" : "Contact"}
                  </a>
                </li>
              </ul>

              {/* Login and Register Buttons (Matching Image) */}
              <div className="d-flex align-items-center gap-2">
                <LanguageSwitcher />
                <Link
                  to="/login"
                  className="btn btn-sm px-3 py-1 rounded-pill fw-semibold"
                  style={{
                    border: "1px solid #cbd5e1",
                    color: "#247b88",
                    backgroundColor: "#ffffff",
                  }}
                >
                  👤 {t("login")}
                </Link>
                <Link
                  to="/register-nhg"
                  className="btn btn-sm px-3 py-1 rounded-pill fw-semibold text-white shadow-sm"
                  style={{
                    backgroundColor: "#248f9d",
                    border: "1px solid #248f9d",
                  }}
                >
                  👥 {isMl ? "അയൽക്കൂട്ടം രജിസ്റ്റർ ചെയ്യുക" : "Register NHG"}
                </Link>
              </div>
            </>
          ) : (
            /* IF LOGGED IN: Contextual Navigation Links */
            <>
              <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1 kc-auth-nav-links">
                {/* 1. Dashboard (All roles) */}
                <li className="nav-item">
                  <Link
                    to="/dashboard"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                      isActive("/dashboard") ? "active-role-nav" : "text-dark"
                    }`}
                  >
                    📊 {t("navDashboard")}
                  </Link>
                </li>

                <li className="nav-item">
                  <Link
                    to="/learning"
                    className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                      isActive("/learning") ? "active-role-nav" : "text-dark"
                    }`}
                  >
                    📚 {isMl ? "പഠനം" : "Learning"}
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
                        🏛️ {isMl ? "അയൽക്കൂട്ടങ്ങളും രജിസ്ട്രേഷനും" : "NHGs & Registrations"}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/members"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/members") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        👥 {t("navMembers")}
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
                        📱 {t("navAttendance")}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 {t("navLoans")}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 {isMl ? "സമ്പാദ്യം" : "Savings"}
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
                        📢 {isMl ? "അറിയിപ്പുകൾ" : "Notices"}
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
                        👥 {t("navMembers")}
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
                        📱 {isMl ? "യോഗ ഹാജർ" : "Meeting Attendance"}
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
                        📅 {t("navMeetings")}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 {isMl ? "സമ്പാദ്യം / പാസ്ബുക്ക്" : "Savings / Passbook"}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 {t("navLoans")}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/jobs" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/jobs") ? "active-role-nav" : "text-dark"}`}>
                        💼 {isMl ? "സാമൂഹിക ജോലികൾ" : "Community Jobs"}
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
                        📢 {isMl ? "അറിയിപ്പുകൾ" : "Notices"}
                      </Link>
                    </li>
                  </>
                )}

                {/* 4. MEMBER LINKS */}
                {isLoanReviewer && (
                  <>
                    {isBankOfficer && <li className="nav-item">
                      <Link to="/loans" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}>
                        🏦 {isMl ? "ഡെമോ ബാങ്ക് പരിശോധന" : "Demo Bank Review"}
                      </Link>
                    </li>}
                    {isAdsOfficer && <li className="nav-item">
                      <Link
                        to="/ads"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/ads") ? "active-role-nav" : "text-dark"}`}
                      >
                        🏛️ {isMl ? "എ.ഡി.എസ് വായ്പ വിഭാഗം" : "ADS Loan Desk"}
                      </Link>
                    </li>}
                    {isCdsOfficer && <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/loans") ? "active-role-nav" : "text-dark"}`}
                      >
                        🏦 {isMl ? "സി.ഡി.എസ് വായ്പ പരിശോധന" : "CDS Loan Review"}
                      </Link>
                    </li>}
                    <li className="nav-item">
                      <Link
                        to="/circulars"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/circulars") ? "active-role-nav" : "text-dark"}`}
                      >
                        📢 {isMl ? "അറിയിപ്പുകൾ" : "Notices"}
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
                        📱 {isMl ? "ക്യു.ആർ ഹാജർ രേഖപ്പെടുത്തുക" : "Scan QR Attendance"}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/thrift"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/thrift") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💳 {isMl ? "എന്റെ പാസ്ബുക്ക്" : "My Passbook"}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/loans"
                        className={`nav-link px-3 py-1 fw-semibold rounded-pill ${
                          isActive("/loans") ? "active-role-nav" : "text-dark"
                        }`}
                      >
                        💰 {isMl ? "എന്റെ വായ്പകൾ" : "My Loans"}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/jobs" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/jobs") ? "active-role-nav" : "text-dark"}`}>
                        💼 {isMl ? "എന്റെ ജോലികൾ" : "My Jobs"}
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
                        📢 {isMl ? "അറിയിപ്പുകൾ" : "Notices"}
                      </Link>
                    </li>
                  </>
                )}
                {user && <li className="nav-item">
                  <Link to="/community-hub" className={`nav-link px-3 py-1 fw-semibold rounded-pill ${isActive("/community-hub") ? "active-role-nav" : "text-dark"}`}>
                    🌱 {isMl ? "കമ്മ്യൂണിറ്റി ഹബ്" : "Community Hub"}
                  </Link>
                </li>}
              </ul>

              {/* Right Profile & Logout */}
              <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0 kc-profile-actions">
                <LanguageSwitcher />
                <div
                  className="px-3 py-1 rounded-pill small border kc-profile-pill"
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
                  {isMainAdmin ? (isMl ? "🛡️ പ്രധാന അഡ്മിൻ" : "🛡️ Main Admin") : isSecretary ? `👑 ${user.nhgName || (isMl ? "സെക്രട്ടറി" : "Secretary")}` : `👤 ${user.name}`}
                </div>

                <button
                  type="button"
                  className="btn btn-sm rounded-pill px-3 py-1 kc-logout-btn"
                  onClick={handleLogout}
                >
                  ↪ {t("logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .active-role-nav {
          background-color: #e3f1f3 !important;
          color: #1a5965 !important;
        }
        .active-public-nav {
          background-color: #e3f1f3 !important;
          color: #1a5965 !important;
        }
        .hover-white:hover {
          color: #ffffff !important;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
