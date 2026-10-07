import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { speakMemberWelcome } from "../utils/welcomeSpeech";
import "../Login.css";

const Login = ({ accountType = "" }) => {
  const { t, i18n } = useTranslation();
  const isMl = i18n.language === "ml";
  const { login } = useAuth();
  const navigate = useNavigate();

  // Existing authentication state (Preserved exactly)
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      const role = (data.role || data.rawRole || "").toLowerCase().replace(/[-_]/g, "");
      const isSecretary = role === "secretary" || role === "nhgsecretary";
      const isMember = role === "member";
      const isBankOfficer = role === "bankofficer";
      if (accountType === "secretary" && !isSecretary) {
        setError("This is the Secretary sign-in. Please use a Secretary account.");
        return;
      }
      if (accountType === "member" && !isMember) {
        setError("This is the Member sign-in. Please use a Member account.");
        return;
      }
      login(data);
      if (isMember) {
        // Start speech in the sign-in flow, close to the member's submit
        // gesture, and prevent the dashboard from speaking a duplicate.
        sessionStorage.setItem("kconnect_welcome_user_v2", data._id);
        speakMemberWelcome(data.name, i18n.resolvedLanguage || i18n.language);
      }
      navigate(isBankOfficer ? "/loans" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || (isMl ? "ലോഗിൻ പരാജയപ്പെട്ടു" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotMessage(res.data?.message || (isMl ? "നിർദ്ദേശങ്ങൾ അയച്ചു" : "Password reset instructions dispatched"));
    } catch (err) {
      setForgotMessage(
        err.response?.data?.message ||
        (isMl
          ? "പാസ്‌വേഡ് മാറ്റാൻ നിങ്ങളുടെ NHG സെക്രട്ടറിയെ സമീപിക്കുക."
          : "Please contact your NHG Secretary to reset credentials.")
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const setDemoAccount = (email, password) => {
    setForm({ email, password });
    setError("");
  };

  return (
    <div className="kc-auth-container">
      {/* TOP COMPACT BAR: BRAND & LANGUAGE */}
      <header className="kc-auth-topbar">
        <div className="kc-auth-brand">
          <div className="kc-brand-badge">KC</div>
          <div className="kc-brand-text">
            <span className="kc-brand-title">K-Connect</span>
            <span className="kc-brand-subtitle">
              {isMl ? "കുടുംബശ്രീ ഡിജിറ്റൽ പോർട്ടൽ" : "Kudumbashree Platform"}
            </span>
          </div>
        </div>
        <div className="kc-topbar-actions">
          <LanguageSwitcher />
        </div>
      </header>

      {/* CENTERED AUTHENTICATION CARD */}
      <main className="kc-auth-main">
        <div className="kc-auth-card">
          {/* Card Header */}
          <div className="kc-auth-header">
            <span className="kc-auth-tag">
              {isMl ? "സ്വാഗതം" : "WELCOME BACK"}
            </span>
            <h1 className="kc-auth-heading">
              {isMl ? "പോർട്ടൽ ലോഗിൻ" : "Sign In"}
            </h1>
            {accountType && (
              <div className="badge rounded-pill bg-success-subtle text-success mb-2">
                {accountType === "secretary" ? "NHG Secretary account" : "NHG Member account"}
              </div>
            )}
            <p className="kc-auth-desc">
              {isMl
                ? "തുടരുന്നതിന് നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് പ്രവേശിക്കുക"
                : accountType === "secretary" ? "Use your NHG Secretary email and password to manage your NHG and meeting QR code." : accountType === "member" ? "Use your Member email and password to scan meeting QR codes and check your attendance." : "Enter your registered credentials to access your account"}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="kc-auth-alert" role="alert">
              <span className="kc-alert-icon">⚠️</span>
              <span className="kc-alert-text">{error}</span>
            </div>
          )}

          {/* Pure Login Form */}
          <form onSubmit={handleSubmit} className="kc-auth-form" noValidate>
            {/* Email Field */}
            <div className="kc-field-group">
              <label htmlFor="kc-email" className="kc-field-label">
                {t("email")}
              </label>
              <div className="kc-field-wrapper">
                <span className="kc-field-icon">✉️</span>
                <input
                  id="kc-email"
                  type="email"
                  name="email"
                  className="kc-field-input"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="kc-field-group">
              <div className="kc-label-row">
                <label htmlFor="kc-password" className="kc-field-label">
                  {t("password")}
                </label>
                <button
                  type="button"
                  className="kc-link-btn"
                  onClick={() => {
                    setForgotEmail(form.email);
                    setForgotMessage("");
                    setShowForgotModal(true);
                  }}
                >
                  {isMl ? "പാസ്‌വേഡ് മറന്നോ?" : "Forgot Password?"}
                </button>
              </div>
              <div className="kc-field-wrapper">
                <span className="kc-field-icon">🔐</span>
                <input
                  id="kc-password"
                  type="password"
                  name="password"
                  className="kc-field-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              className="kc-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="kc-btn-spinner" aria-hidden="true"></span>
                  <span>{t("loading")}</span>
                </>
              ) : (
                <>
                  <span>{isMl ? "ലോഗിൻ ചെയ്യുക" : "Sign In to K-Connect"}</span>
                  <span className="kc-btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="kc-auth-footer">
            <span className="kc-footer-text">
              {t("dontHaveAccount")}{" "}
            </span>
            <Link to="/register" className="kc-register-link">
              {isMl ? "പുതിയ അക്കൗണ്ട് സൃഷ്ടിക്കുക" : "Register"} →
            </Link>
          </div>

          <div className="d-flex justify-content-center gap-3 flex-wrap mt-3 small">
            {accountType !== "member" && <Link to="/member-login">Member sign in</Link>}
            {accountType !== "secretary" && <Link to="/secretary-login">Secretary sign in</Link>}
          </div>

          {/* Quick Demo Helper (Minimal & Collapsed by Default) */}
          <div className="kc-demo-helper">
            <button
              type="button"
              className="kc-demo-toggle-btn"
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
            >
              <span>⚡ {isMl ? "ടെസ്റ്റ് ഡെമോ അക്കൗണ്ടുകൾ" : "Quick Demo Accounts"}</span>
              <span className="kc-toggle-arrow">{showDemoCredentials ? "▴" : "▾"}</span>
            </button>

            {showDemoCredentials && (
              <div className="kc-demo-pills">
                <button
                  type="button"
                  className="kc-demo-pill superadmin"
                  onClick={() => setDemoAccount("admin@kconnect.gov.in", "admin123")}
                >
                  <span className="kc-pill-role">🛡️ Super Admin</span>
                  <span className="kc-pill-desc">Platform Management</span>
                </button>
                <button
                  type="button"
                  className="kc-demo-pill secretary"
                  onClick={() => setDemoAccount("archana552m@gmail.com", "password123")}
                >
                  <span className="kc-pill-role">👑 NHG Secretary</span>
                  <span className="kc-pill-desc">deepam NHG</span>
                </button>
                <button
                  type="button"
                  className="kc-demo-pill member"
                  onClick={() => setDemoAccount("anu@gmail.com", "password123")}
                >
                  <span className="kc-pill-role">👤 Member</span>
                  <span className="kc-pill-desc">deepam NHG</span>
                </button>
                <button
                  type="button"
                  className="kc-demo-pill officer"
                  onClick={() => setDemoAccount("cds.officer@kudumbashree.gov.in", "password123")}
                >
                  <span className="kc-pill-role">🏛️ CDS Officer</span>
                  <span className="kc-pill-desc">Panchayath Level</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="kc-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <div className="kc-modal-icon-wrap">🔑</div>
              <div>
                <h3 className="kc-modal-title">
                  {isMl ? "പാസ്‌വേഡ് വീണ്ടെടുക്കുക" : "Forgot Password"}
                </h3>
                <p className="kc-modal-desc">
                  {isMl
                    ? "രജിസ്റ്റർ ചെയ്ത ഇമെയിൽ നൽകുക"
                    : "Enter your registered email address"}
                </p>
              </div>
              <button
                type="button"
                className="kc-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="kc-modal-body">
              {forgotMessage ? (
                <div className="kc-modal-alert">
                  <span className="kc-alert-icon">ℹ️</span>
                  <span>{forgotMessage}</span>
                </div>
              ) : (
                <p className="kc-modal-info">
                  {isMl
                    ? "നിങ്ങളുടെ പാസ്‌വേഡ് സുരക്ഷിതമായി പുനഃക്രമീകരിക്കാനുള്ള വിവരങ്ങൾ അയയ്ക്കും. നിങ്ങൾക്ക് NHG സെക്രട്ടറിയുമായും ബന്ധപ്പെടാവുന്നതാണ്."
                    : "Instructions to securely reset your credentials will be dispatched. You can also contact your NHG Secretary to verify your identity."}
                </p>
              )}

              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="kc-field-group">
                  <label className="kc-field-label">{t("email")}</label>
                  <div className="kc-field-wrapper">
                    <span className="kc-field-icon">✉️</span>
                    <input
                      type="email"
                      className="kc-field-input"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="kc-modal-actions">
                  <button
                    type="button"
                    className="kc-btn-secondary"
                    onClick={() => setShowForgotModal(false)}
                  >
                    {isMl ? "റദ്ദാക്കുക" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="kc-btn-primary"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      t("loading")
                    ) : (
                      isMl ? "അഭ്യർത്ഥന സമർപ്പിക്കുക" : "Submit Request"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
