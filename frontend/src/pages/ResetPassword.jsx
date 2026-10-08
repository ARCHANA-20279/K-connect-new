import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";

export default function ResetPassword() {
  const { token } = useParams();
  const { i18n } = useTranslation();
  const isMl = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage(isMl ? "രണ്ട് പാസ്‌വേഡുകളും ഒരുപോലെയായിരിക്കണം." : "The passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
      setIsError(false);
      setMessage(data.message);
      setComplete(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || (isMl ? "പാസ്‌വേഡ് മാറ്റാനായില്ല. പുതിയ ലിങ്ക് അഭ്യർത്ഥിക്കുക." : "Could not reset the password. Request a new reset link."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container py-5" style={{ maxWidth: 540 }}>
      <section className="card border-0 shadow-sm p-4 p-md-5" style={{ borderRadius: 22 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <span aria-hidden="true" style={{ fontSize: 30 }}>🔐</span>
          <div>
            <h1 className="h3 fw-bold mb-1">{isMl ? "പുതിയ പാസ്‌വേഡ് സൃഷ്ടിക്കുക" : "Create a new password"}</h1>
            <p className="text-muted mb-0">{isMl ? "പാസ്‌വേഡ് കുറഞ്ഞത് 8 അക്ഷരമെങ്കിലും വേണം." : "Use at least 8 characters for your password."}</p>
          </div>
        </div>
        {message && <div className={`alert ${isError ? "alert-danger" : "alert-success"}`} role="status">{message}</div>}
        {!complete && (
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="new-password">{isMl ? "പുതിയ പാസ്‌വേഡ്" : "New password"}</label>
              <input id="new-password" className="form-control form-control-lg" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="confirm-password">{isMl ? "പാസ്‌വേഡ് വീണ്ടും നൽകുക" : "Confirm password"}</label>
              <input id="confirm-password" className="form-control form-control-lg" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </div>
            <button className="btn btn-success btn-lg w-100" type="submit" disabled={saving}>
              {saving ? (isMl ? "സംരക്ഷിക്കുന്നു…" : "Saving…") : (isMl ? "പാസ്‌വേഡ് മാറ്റുക" : "Reset password")}
            </button>
          </form>
        )}
        <div className="text-center mt-4 small"><Link to="/login">{isMl ? "ലോഗിനിലേക്ക് മടങ്ങുക" : "Back to sign in"}</Link></div>
      </section>
    </main>
  );
}
