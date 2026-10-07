import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { t, i18n } = useTranslation();
  const isMl = i18n.language === "ml";
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    nhgName: "Ward 15 Ayalkoottam",
    nhgId: "",
    phone: "",
  });
  const [availableNHGs, setAvailableNHGs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNHGs = async () => {
      try {
        const res = await api.get("/nhgs/public-list");
        if (res.data?.nhgs) {
          setAvailableNHGs(res.data.nhgs);
          if (res.data.nhgs.length > 0) {
            setForm((prev) => {
              const current = res.data.nhgs.find((nhg) => nhg.name === prev.nhgName) || res.data.nhgs[0];
              return { ...prev, nhgName: current.name, nhgId: current.nhgId || "" };
            });
          }
        }
      } catch (e) {
        console.warn("Could not fetch NHGs list:", e);
      }
    };
    fetchNHGs();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      if (data.pendingApproval) {
        setSuccess(true);
        return;
      }
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-container">
      {/* LEFT COLUMN: HERO SHOWCASE */}
      <div className="split-login-hero">
        <div className="split-hero-content">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-4" style={{ background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.25)" }}>
            <span className="fs-6">✨</span>
            <span className="text-white small fw-bold">
              {isMl ? "പുതിയ അയൽക്കൂട്ട അംഗത്വം" : "Join Kudumbashree Community"}
            </span>
          </div>

          <h1 className="display-5 fw-bolder text-white mb-3" style={{ letterSpacing: "-0.5px" }}>
            {isMl ? (
              <>
                കുടുംബശ്രീയിലേക്ക് സ്വാഗതം,<br />
                <span style={{ color: "#34d399" }}>കൂട്ടായ്മയിൽ പങ്കാളിയാകൂ.</span>
              </>
            ) : (
              <>
                Become a Member of<br />
                <span style={{ color: "#34d399" }}>Our Self-Help Movement.</span>
              </>
            )}
          </h1>

          <p className="text-emerald-100 fs-6 mb-4 lh-base" style={{ color: "#d1fae5", maxWidth: "520px" }}>
            {isMl
              ? "പ്രതിവാര ലഘുസമ്പാദ്യം, കൃഷി സംരംഭങ്ങൾ, സാമ്പത്തിക സ്വയംപര്യാപ്തത എന്നിവ ഉറപ്പാക്കുന്ന ഡിജിറ്റൽ അയൽക്കൂട്ട സംവിധാനത്തിൽ നിങ്ങളുടെ അക്കൗണ്ട് രജിസ്റ്റർ ചെയ്യുക."
              : "Register your member or leadership profile in K-Connect to gain instant access to digital passbooks, meeting schedules, microfinance requests, and subsidized training."}
          </p>

          <div className="p-3 rounded-3 mb-4" style={{ background: "rgba(255, 255, 255, 0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.15)", maxWidth: "480px" }}>
            <h6 className="text-white fw-bold mb-2">📋 {isMl ? "അംഗത്വ ആനുകൂല്യങ്ങൾ" : "Member Privileges"}</h6>
            <ul className="list-unstyled mb-0 text-white-50 small d-flex flex-column gap-1">
              <li>✓ {isMl ? "വ്യക്തിഗത ഡിജിറ്റൽ പാസ്ബുക്കും തത്സമയ ബാലൻസും" : "Personal digital thrift passbook & live savings ledger"}</li>
              <li>✓ {isMl ? "ക്യുആർ കോഡ് അടിസ്ഥാനമാക്കിയുള്ള അതിവേഗ ഹാജർ" : "QR code encoded smart member attendance card"}</li>
              <li>✓ {isMl ? "സർക്കാർ കൃഷി സബ്‌സിഡികളും പരിശീലനങ്ങളും" : "Access to organic farming JLG subsidies & skill workshops"}</li>
            </ul>
          </div>

          <Link to="/login" className="text-white text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 small">
            <span>←</span>
            <span>{isMl ? "ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ? ലോഗിൻ ചെയ്യുക" : "Already registered? Return to Login"}</span>
          </Link>
        </div>
      </div>

      {/* RIGHT COLUMN: REGISTRATION FORM */}
      <div className="split-login-form-panel">
        <div className="split-form-card shadow-lg">
          <div className="text-center mb-4">
            <h3 className="fw-bolder text-dark mb-1">{t("register")}</h3>
            <p className="text-muted small mb-0">
              {isMl
                ? "നിങ്ങളുടെ വിവരങ്ങൾ നൽകി അക്കൗണ്ട് സൃഷ്ടിക്കുക"
                : "Enter your details to create your Kudumbashree account"}
            </p>
          </div>

          {error && <div className="alert alert-danger py-2 small mb-3" role="alert">{error}</div>}

          {success ? (
            <div className="alert alert-success" role="status">
              <h5 className="fw-bold">{isMl ? "അംഗത്വ അഭ്യർത്ഥന അയച്ചു" : "Membership request sent"}</h5>
              <p className="mb-2">
                {isMl
                  ? "നിങ്ങളുടെ NHG സെക്രട്ടറിയുടെ അംഗീകാരം ലഭിച്ച ശേഷം ലോഗിൻ ചെയ്യാം."
                  : "Your NHG Secretary must approve your membership before you can sign in. You can return here after approval."}
              </p>
              <Link to="/login" className="btn btn-success btn-sm fw-semibold">{t("login")}</Link>
            </div>
          ) : (

          <form onSubmit={handleSubmit}>
            <div className="row g-2 mb-3">
              <div className="col-12">
                <label className="form-label small fw-semibold text-dark">{t("name")} *</label>
                <input type="text" name="name" className="form-control" placeholder="e.g. Sujatha Nair" value={form.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-dark">{t("email")} *</label>
              <input type="email" name="email" className="form-control" placeholder="name@example.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark">{t("password")} *</label>
                <input type="password" name="password" className="form-control" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark">{t("phone")}</label>
                <input type="text" name="phone" className="form-control" placeholder="98XXXXXXXX" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark">{t("role")} *</label>
                <select name="role" className="form-select" value={form.role} onChange={handleChange}>
                  <option value="member">👤 {t("member")}</option>
                  <option value="secretary">👑 {t("secretary")}</option>
                  <option value="ads_officer">🏛️ {isMl ? "എ.ഡി.എസ് ഓഫീസർ" : "ADS Officer"}</option>
                  <option value="cds_officer">🏛️ {isMl ? "സി.ഡി.എസ് ഓഫീസർ" : "CDS Officer"}</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark">{t("nhgName")}</label>
                {form.role === "member" ? (
                  <select
                    name="nhgId"
                    className="form-select"
                    value={form.nhgId}
                    onChange={(e) => {
                      const selected = availableNHGs.find((nhg) => nhg.nhgId === e.target.value);
                      setForm((prev) => ({ ...prev, nhgId: e.target.value, nhgName: selected?.name || "" }));
                    }}
                    required
                  >
                    <option value="">{isMl ? "അയൽക്കൂട്ടം തിരഞ്ഞെടുക്കുക" : "Choose your NHG"}</option>
                    {availableNHGs.map((nhg) => (
                      <option key={nhg.nhgId || nhg.name} value={nhg.nhgId || ""}>
                        {nhg.name} — {isMl ? `വാർഡ് ${nhg.ward || "15"}` : `Ward ${nhg.ward || "15"}`}
                      </option>
                    ))}
                  </select>
                ) : <input
                  type="text"
                  name="nhgName"
                  list="nhg-options"
                  className="form-control"
                  placeholder="Select or enter NHG Name"
                  value={form.nhgName}
                  onChange={handleChange}
                  required={form.role !== "ads_cds_officer"}
                />}
                {form.role !== "member" && <datalist id="nhg-options">
                  {availableNHGs.map((nhg) => <option key={nhg._id || nhg.name} value={nhg.name} />)}
                </datalist>}
              </div>
              {form.role === "member" && (
                <div className="col-12">
                  <small className="form-text text-muted d-block">
                    If you are an NHG Secretary too, create a separate Member account with a different email and password to scan meeting QR codes and mark your attendance. Use your Secretary account to manage the NHG and generate meeting QR codes.
                  </small>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-success w-100 py-2 fw-bold shadow-sm rounded-pill mb-3"
              style={{ background: "linear-gradient(135deg, #047857 0%, #065f46 100%)", border: "none" }}
              disabled={loading}
            >
              {loading ? t("loading") : isMl ? "രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുക ✓" : "Complete Registration ✓"}
            </button>
          </form>
          )}

          <p className="text-center small text-muted mb-0">
            {t("alreadyHaveAccount")}{" "}
            <Link to="/login" className="fw-bold text-primary text-decoration-none">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
