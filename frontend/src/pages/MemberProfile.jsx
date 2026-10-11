import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const profileFields = [
  ["name", "Full name", "text"],
  ["phone", "Phone number", "tel"],
  ["email", "Email address", "email"],
  ["address", "Address", "text"],
  ["ward", "Ward", "text"],
];

const MemberProfile = () => {
  const { i18n } = useTranslation();
  const ml = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ml");
  const fields = profileFields.map(([key, label, type]) => [key, ml ? ({ "Full name": "പൂർണ്ണ പേര്", "Phone number": "ഫോൺ നമ്പർ", "Email address": "ഇമെയിൽ വിലാസം", Address: "വിലാസം", Ward: "വാർഡ്" }[label]) : label, type]);
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/members/me/profile");
      setProfile(data.profile);
      updateUser({
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone,
        memberId: data.profile.memberId,
        nhgId: data.profile.nhgId,
        nhgName: data.profile.nhgName,
      });
      setForm({
        name: data.profile.name || "",
        phone: data.profile.phone || "",
        email: data.profile.email || "",
        address: data.profile.address || "",
        ward: data.profile.ward || "",
      });
      setPendingRequest(data.pendingRequest || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || (ml ? "പ്രൊഫൈൽ ലഭ്യമാക്കാനായില്ല." : "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/members/me/profile-updates", { profile: form });
      setPendingRequest(data.pendingRequest);
      setEditing(false);
      setNotice(data.message || (ml ? "നിങ്ങളുടെ മാറ്റങ്ങൾ പരിശോധനയ്ക്കായി അയൽക്കൂട്ടം സെക്രട്ടറിക്ക് അയച്ചു." : "Your changes were sent to your NHG Secretary for verification."));
    } catch (submitError) {
      setError(submitError.response?.data?.message || (ml ? "പ്രൊഫൈൽ മാറ്റങ്ങൾ സമർപ്പിക്കാനായില്ല." : "Could not submit your profile changes."));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!profile) return;
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      address: profile.address || "",
      ward: profile.ward || "",
    });
    setEditing(false);
    setError("");
  };

  if (loading) return <div className="container py-5 text-center text-muted">{ml ? "പ്രൊഫൈൽ ലോഡ് ചെയ്യുന്നു…" : "Loading your profile…"}</div>;
  if (!profile) return <div className="container py-5"><div className="alert alert-danger">{error || (ml ? "പ്രൊഫൈൽ ലഭ്യമല്ല." : "Profile unavailable.")}</div></div>;

  return (
    <div className="container py-4" style={{ maxWidth: 920 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="small fw-bold text-success text-uppercase" style={{ letterSpacing: ".08em" }}>{ml ? "അംഗ അക്കൗണ്ട്" : "Member account"}</div>
          <h1 className="h2 fw-bold mb-1 mt-1">{ml ? "എന്റെ പ്രൊഫൈൽ" : "My profile"}</h1>
          <p className="text-muted mb-0">{ml ? "നിങ്ങളുടെ വിവരങ്ങൾ കാണുക; മാറ്റങ്ങൾ അയൽക്കൂട്ടം സെക്രട്ടറിക്ക് സമർപ്പിക്കുക." : "View your details and request changes from your NHG Secretary."}</p>
        </div>
        <Link to="/dashboard" className="btn btn-outline-secondary">{ml ? "ഡാഷ്ബോർഡിലേക്ക് മടങ്ങുക" : "Back to dashboard"}</Link>
      </div>

      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {pendingRequest && (
        <section className="card border-warning-subtle shadow-sm mb-4" aria-labelledby="profile-request-heading">
          <div className="card-body">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <h2 id="profile-request-heading" className="h5 fw-bold mb-0">{ml ? "പരിശോധന കാത്തിരിക്കുന്ന പ്രൊഫൈൽ മാറ്റങ്ങൾ" : "Profile changes awaiting verification"}</h2>
              <span className="badge text-bg-warning">{ml ? "സെക്രട്ടറിയെ കാത്തിരിക്കുന്നു" : "Waiting for Secretary"}</span>
            </div>
            <p className="text-muted small">{ml ? "അയൽക്കൂട്ടം സെക്രട്ടറി അംഗീകരിക്കുന്നതുവരെ നിലവിലെ പ്രൊഫൈൽ അതേപടി തുടരും." : "Your current profile stays as it is until your NHG Secretary approves these changes."}</p>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th scope="col">{ml ? "വിവരം" : "Detail"}</th><th scope="col">{ml ? "നിലവിൽ" : "Current"}</th><th scope="col">{ml ? "ആവശ്യപ്പെട്ടത്" : "Requested"}</th></tr></thead>
                <tbody>
                  {Object.entries(pendingRequest.proposedChanges || {}).map(([field, change]) => (
                    <tr key={field}><th scope="row" className="text-capitalize">{field}</th><td>{change.from || "—"}</td><td className="fw-semibold">{change.to || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="card shadow-sm border-0" aria-labelledby="member-profile-details">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h2 id="member-profile-details" className="h5 fw-bold mb-1">{ml ? "വ്യക്തിഗത വിവരങ്ങൾ" : "Personal details"}</h2>
              <div className="small text-muted">{ml ? "അംഗ ഐഡി" : "Member ID"} <strong className="text-primary">{profile.memberId}</strong> · {profile.nhgName || "NHG"}</div>
            </div>
            {!editing && !pendingRequest && <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>{ml ? "വിവരങ്ങൾ തിരുത്തുക" : "Edit details"}</button>}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {fields.map(([key, label, type]) => (
                  <div className={key === "address" ? "col-12" : "col-md-6"} key={key}>
                    <label htmlFor={`profile-${key}`} className="form-label fw-semibold">{label}</label>
                    {key === "address" ? (
                      <textarea id={`profile-${key}`} className="form-control" rows="3" value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} required />
                    ) : (
                      <input id={`profile-${key}`} className="form-control" type={type} value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} required={key !== "email"} />
                    )}
                  </div>
                ))}
              </div>
              <div className="alert alert-info mt-4 mb-3">{ml ? "സമർപ്പിച്ച മാറ്റങ്ങൾ പരിശോധനയ്ക്കായി അയൽക്കൂട്ടം സെക്രട്ടറിക്ക് ലഭിക്കും. അംഗീകാരത്തിന് ശേഷം മാത്രമേ വിവരങ്ങൾ മാറൂ." : "Submitted edits go to your NHG Secretary for verification. Your saved details change only after approval."}</div>
              <div className="d-flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? (ml ? "പരിശോധനയ്ക്ക് അയയ്ക്കുന്നു…" : "Sending for review…") : (ml ? "പരിശോധനയ്ക്ക് സമർപ്പിക്കുക" : "Submit for verification")}</button>
                <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit} disabled={saving}>{ml ? "റദ്ദാക്കുക" : "Cancel"}</button>
              </div>
            </form>
          ) : (
            <div className="row g-3">
              {fields.map(([key, label]) => (
                <div className="col-md-6" key={key}>
                  <div className="small text-muted mb-1">{label}</div>
                  <div className="fw-semibold">{profile[key] || (ml ? "നൽകിയിട്ടില്ല" : "Not provided")}</div>
                </div>
              ))}
              <div className="col-md-6">
                <div className="small text-muted mb-1">{ml ? "അയൽക്കൂട്ടം" : "NHG"}</div>
                <div className="fw-semibold">{profile.nhgName || (ml ? "നൽകിയിട്ടില്ല" : "Not provided")}</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MemberProfile;
