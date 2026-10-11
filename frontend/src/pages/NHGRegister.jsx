import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import "./NHGRegister.css";

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
const DISTRICT_NAMES_ML = {
  Kannur: "കണ്ണൂർ", Kozhikode: "കോഴിക്കോട്", Ernakulam: "എറണാകുളം", Thiruvananthapuram: "തിരുവനന്തപുരം",
  Thrissur: "തൃശ്ശൂർ", Malappuram: "മലപ്പുറം", Kollam: "കൊല്ലം", Palakkad: "പാലക്കാട്",
  Alappuzha: "ആലപ്പുഴ", Kottayam: "കോട്ടയം", Kasaragod: "കാസർഗോഡ്", Pathanamthitta: "പത്തനംതിട്ട",
  Idukki: "ഇടുക്കി", Wayanad: "വയനാട്",
};

const NHGRegister = () => {
  const { i18n } = useTranslation();
  const ml = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ml");
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
    const nextValue = name === "secretaryMobileNumber"
      ? value.replace(/\D/g, "").slice(0, 10)
      : name === "secretaryEmail"
        ? value.toLowerCase()
        : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password.length < 8) {
      setError(ml ? "കുറഞ്ഞത് 8 അക്ഷരങ്ങളുള്ള പാസ്‌വേഡ് സൃഷ്ടിക്കുക." : "Create a password with at least 8 characters.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.secretaryMobileNumber)) {
      setError(ml ? "6, 7, 8, അല്ലെങ്കിൽ 9-ൽ തുടങ്ങുന്ന 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക." : "Enter a 10-digit Indian mobile number beginning with 6, 7, 8, or 9.");
      return;
    }
    setLoading(true);

    try {
      const res = await api.post("/nhgs/register", formData);
      setSubmittedData(res.data?.nhg || formData);
    } catch (err) {
      console.error("NHG registration failed:", err);
      setError(err.response?.data?.message || (ml ? "അയൽക്കൂട്ടം രജിസ്ട്രേഷൻ സമർപ്പിക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക." : "Failed to submit NHG registration. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kc-nhg-register-page">
      <div className="kc-nhg-register-layout">
        <aside className="kc-nhg-register-aside">
          <Link to="/" className="kc-nhg-back-link">← {ml ? "ഹോം പേജിലേക്ക് മടങ്ങുക" : "Back to Home"}</Link>
          <div className="kc-nhg-register-photo">
            <img src="/kudumbashree-hero.png" alt="Kudumbashree neighbourhood group members meeting together" />
            <span className="kc-nhg-photo-caption">{ml ? "ഓരോ അയൽക്കൂട്ടത്തിലും ഒരുമിച്ച് കൂടുതൽ ശക്തരാകാം" : "Stronger together, in every neighbourhood"}</span>
          </div>
          <div className="kc-nhg-aside-copy">
            <span className="kc-nhg-aside-kicker">K-Connect · Kudumbashree</span>
            <h1>{ml ? "നിങ്ങളുടെ അയൽക്കൂട്ടത്തെ കൂടുതൽ ശക്തവും ബന്ധിപ്പിച്ചതുമായ സമൂഹമാക്കൂ." : "Bring your NHG into a stronger, connected community."}</h1>
            <p>{ml ? "അംഗങ്ങൾ, യോഗങ്ങൾ, സമ്പാദ്യം, സേവനങ്ങൾ എന്നിവ ഏകോപിപ്പിക്കാൻ സെക്രട്ടറിക്ക് ഒരിടം നൽകൂ." : "Register your Neighbourhood Group and give your Secretary a single place to coordinate members, meetings, savings, and services."}</p>
            <div className="kc-nhg-tier-pills" aria-label="Kudumbashree three-tier structure">
              <span>NHG</span><i aria-hidden="true" /><span>ADS</span><i aria-hidden="true" /><span>CDS</span>
            </div>
          </div>
        </aside>

        <main className="kc-nhg-register-main">
          <header className="kc-nhg-register-heading">
            <span className="kc-nhg-register-icon" aria-hidden="true">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h2>{ml ? "കുടുംബശ്രീ അയൽക്കൂട്ടം രജിസ്റ്റർ ചെയ്യുക" : "Register Your Kudumbashree NHG"}</h2>
              <p>{ml ? "പരിശോധന ആരംഭിക്കാൻ അയൽക്കൂട്ടത്തിന്റെയും സെക്രട്ടറിയുടെയും വിവരങ്ങൾ നൽകുക." : "Enter your group and Secretary details to begin the verification process."}</p>
            </div>
          </header>

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
              {ml ? "അപേക്ഷ സമർപ്പിച്ചു!" : "Application Submitted!"}
            </h3>

            <div
              className="alert alert-success py-3 px-4 my-3 text-start mx-auto"
              style={{ maxWidth: "600px", borderRadius: "12px", border: "1px solid #a7f3d0", backgroundColor: "#f0fdf4" }}
            >
              <div className="fw-bold text-success mb-1" style={{ fontSize: "16px" }}>
                {ml ? "അയൽക്കൂട്ട രജിസ്ട്രേഷൻ വിജയകരമായി സമർപ്പിച്ചു. അഡ്മിൻ പരിശോധനയ്ക്കായി കാത്തിരിക്കുന്നു." : "NHG registration submitted successfully. Your application is waiting for admin verification."}
              </div>
              <p className="text-muted small mb-0">
                {ml ? "പ്രധാന അഡ്മിൻ അയൽക്കൂട്ട വിവരങ്ങൾ പരിശോധിക്കും. അംഗീകരിച്ച ശേഷം സെക്രട്ടറിയുടെ ഇമെയിൽ ഉപയോഗിച്ച് പ്രവേശിക്കാം: " : "The Main Admin will review your NHG credentials. Upon approval, you can sign in using your Secretary email: "}<strong>{submittedData.secretaryEmail}</strong>.
              </p>
            </div>

            <div
              className="p-3 my-2 text-start mx-auto bg-light rounded-3"
              style={{ maxWidth: "600px", border: "1px solid #e2e8f0" }}
            >
              <h6 className="fw-bold text-dark mb-2">{ml ? "രജിസ്ട്രേഷൻ സംഗ്രഹം:" : "Registration Summary:"}</h6>
              <div className="row g-2 small">
                <div className="col-sm-6">
                  <strong>{ml ? "അയൽക്കൂട്ടത്തിന്റെ പേര്:" : "NHG Name:"}</strong> {submittedData.name || submittedData.nhgName}
                </div>
                <div className="col-sm-6">
                  <strong>{ml ? "അയൽക്കൂട്ട ഐഡി:" : "Assigned NHG ID:"}</strong> <span className="badge bg-secondary font-monospace">{submittedData.nhgId || (ml ? "അംഗീകാരത്തിനു ശേഷം ലഭിക്കും" : "Generated on Approval")}</span>
                </div>
                <div className="col-sm-6">
                  <strong>{ml ? "തദ്ദേശ സ്ഥാപനം:" : "Local Body:"}</strong> {submittedData.localBodyName} ({submittedData.localBodyType})
                </div>
                <div className="col-sm-6">
                  <strong>{ml ? "വാർഡ് നമ്പർ:" : "Ward Number:"}</strong> {ml ? "വാർഡ് " : "Ward "}{submittedData.ward || submittedData.wardNumber}
                </div>
                <div className="col-sm-6">
                  <strong>{ml ? "സെക്രട്ടറി:" : "Secretary:"}</strong> {submittedData.secretaryName} ({submittedData.secretaryPhone || submittedData.secretaryMobileNumber})
                </div>
                <div className="col-sm-6">
                  <strong>{ml ? "പരിശോധന നില:" : "Verification Status:"}</strong> <span className="badge bg-warning text-dark">{ml ? "അഡ്മിൻ പരിശോധന കാത്തിരിക്കുന്നു" : "Pending Admin Verification"}</span>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3 mt-4">
              <Link
                to="/"
                className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-semibold"
              >
                {ml ? "ഹോം പേജിലേക്ക് മടങ്ങുക" : "Return to Home"}
              </Link>
              <Link
                to="/login"
                className="btn px-4 py-2 rounded-pill fw-semibold text-white"
                style={{ backgroundColor: "#0f766e" }}
              >
                {ml ? "ലോഗിനിലേക്ക് പോകുക" : "Go to Login"}
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

            <form onSubmit={handleSubmit} autoComplete="off">
              <input aria-hidden="true" tabIndex={-1} autoComplete="username" className="position-absolute opacity-0" style={{ width: 1, height: 1, top: -1000 }} />
              <input aria-hidden="true" tabIndex={-1} type="password" autoComplete="current-password" className="position-absolute opacity-0" style={{ width: 1, height: 1, top: -1000 }} />
              {/* SECTION 1: NHG BASIC DETAILS */}
              <div className="mb-4">
                <h5 className="fw-bold pb-2 border-bottom" style={{ color: "#0f766e", fontSize: "16px" }}>
                  {ml ? "1. അയൽക്കൂട്ടത്തിന്റെ വിവരങ്ങൾ" : "1. Neighbourhood Group (NHG) Details"}
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "അയൽക്കൂട്ടത്തിന്റെ പേര് *" : "NHG Name *"}
                    </label>
                    <input
                      type="text"
                      name="nhgName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. ദീപം അയൽക്കൂട്ടം, സ്നേഹ അയൽക്കൂട്ടം" : "e.g. Deepam NHG, Sneha NHG, Jyothi NHG"}
                      value={formData.nhgName}
                      onChange={handleChange}
                      autoComplete="off"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "ജില്ല *" : "District *"}
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
                          {ml ? DISTRICT_NAMES_ML[d] : d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "തദ്ദേശ സ്ഥാപനത്തിന്റെ തരം *" : "Local Body Type *"}
                    </label>
                    <select
                      name="localBodyType"
                      className="form-select"
                      value={formData.localBodyType}
                      onChange={handleChange}
                      required
                    >
                      <option value="Grama Panchayat">{ml ? "ഗ്രാമപഞ്ചായത്ത്" : "Grama Panchayat"}</option>
                      <option value="Municipality">{ml ? "മുനിസിപ്പാലിറ്റി" : "Municipality"}</option>
                      <option value="Corporation">{ml ? "കോർപ്പറേഷൻ" : "Corporation"}</option>
                    </select>
                  </div>

                  <div className="col-md-5">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "തദ്ദേശ സ്ഥാപനത്തിന്റെ പേര് *" : "Local Body Name *"}
                    </label>
                    <input
                      type="text"
                      name="localBodyName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. പരിയാരം ഗ്രാമപഞ്ചായത്ത്" : "e.g. Pariyaram Grama Panchayat"}
                      value={formData.localBodyName}
                      onChange={handleChange}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "വാർഡ് നമ്പർ *" : "Ward Number *"}
                    </label>
                    <input
                      type="text"
                      name="wardNumber"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. 15" : "e.g. 15"}
                      value={formData.wardNumber}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]{1,3}"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "സിഡിഎസ് പേര് *" : "CDS Name *"}
                    </label>
                    <input
                      type="text"
                      name="cdsName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. പരിയാരം സിഡിഎസ്" : "e.g. Pariyaram CDS"}
                      value={formData.cdsName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "എഡിഎസ് പേര് *" : "ADS Name *"}
                    </label>
                    <input
                      type="text"
                      name="adsName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. വാർഡ് 15 എഡിഎസ്" : "e.g. Ward 15 ADS"}
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
                  {ml ? "2. ഭാരവാഹികളുടെയും സെക്രട്ടറിയുടെയും അക്കൗണ്ട് വിവരങ്ങൾ" : "2. Leadership & Secretary Account Details"}
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "പ്രസിഡന്റിന്റെ പേര് *" : "President Name *"}
                    </label>
                    <input
                      type="text"
                      name="presidentName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. ബിന്ദു രാജേഷ്" : "e.g. Bindu Rajesh"}
                      value={formData.presidentName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "സെക്രട്ടറിയുടെ പേര് *" : "Secretary Name *"}
                    </label>
                    <input
                      type="text"
                      name="secretaryName"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. അർച്ചന എം" : "e.g. Archana M"}
                      value={formData.secretaryName}
                      onChange={handleChange}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "സെക്രട്ടറിയുടെ മൊബൈൽ നമ്പർ (അയൽക്കൂട്ട ബന്ധപ്പെടൽ) *" : "Secretary Mobile Number (NHG contact) *"}
                    </label>
                    <input
                      type="tel"
                      name="secretaryMobileNumber"
                      className="form-control"
                      placeholder={ml ? "ഉദാ. 9876543210" : "e.g. 9876543210"}
                      value={formData.secretaryMobileNumber}
                      onChange={handleChange}
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={10}
                      minLength={10}
                      pattern="[6-9][0-9]{9}"
                      title={ml ? "6, 7, 8, അല്ലെങ്കിൽ 9-ൽ തുടങ്ങുന്ന 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക." : "Enter a 10-digit Indian mobile number beginning with 6, 7, 8, or 9."}
                      required
                    />
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      {ml ? "ഇത് അയൽക്കൂട്ടത്തിന്റെ ബന്ധപ്പെടൽ നമ്പറാണ്; നിലവിലെ സെക്രട്ടറിയുടെ മൊബൈൽ നമ്പർ നൽകുക." : "This number is the NHG contact number and should be the current Secretary’s mobile."}
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "സെക്രട്ടറിയുടെ ഇമെയിൽ വിലാസം * (അക്കൗണ്ട് ലോഗിൻ)" : "Secretary Email Address * (Secretary account login)"}
                    </label>
                    <input
                      type="email"
                      name="secretaryEmail"
                      className="form-control"
                      placeholder="secretary@example.com"
                      value={formData.secretaryEmail}
                      onChange={handleChange}
                      autoComplete="off"
                      autoCapitalize="none"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "ലോഗിനിനുള്ള പാസ്‌വേഡ് സൃഷ്ടിക്കുക *" : "Create Password for Login *"}
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      {ml ? "അഡ്മിൻ അയൽക്കൂട്ടം അംഗീകരിച്ച ശേഷം ഈ പാസ്‌വേഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യാം." : "You will use this password once Admin approves your NHG."}
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      {ml ? "അംഗങ്ങളുടെ എണ്ണം *" : "Number of Members *"}
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
                      {ml ? "അഡ്മിൻ പരിശോധനയ്ക്ക് ശേഷം അംഗങ്ങളെ പ്രത്യേകം ചേർക്കാം." : "Individual members can be added after Admin verification."}
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
                  <span>{ml ? "അയൽക്കൂട്ടം ഭാരവാഹികൾക്കുള്ള അറിയിപ്പ്:" : "Notice for NHG Office Bearers:"}</span>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  {ml ? <>രജിസ്ട്രേഷൻ സമർപ്പിച്ചാൽ നിങ്ങളുടെ അയൽക്കൂട്ടത്തിന്റെ നില <strong>പരിശോധന കാത്തിരിക്കുന്നു</strong> എന്നാകും. ലോഗിൻ സജീവമാക്കുന്നതിന് മുമ്പ് പ്രധാന അഡ്മിൻ അപേക്ഷ പരിശോധിക്കും.</> : <>Upon registration submission, your NHG will be marked as <strong>Pending</strong>. The Main Admin will verify the registration before activating your login access.</>}
                </p>
              </div>

              {/* Submit Button */}
              <div className="d-flex justify-content-end gap-3 align-items-center">
                <Link to="/" className="btn btn-outline-secondary px-4 py-2 rounded-pill">
                  {ml ? "റദ്ദാക്കുക" : "Cancel"}
                </Link>
                <button
                  type="submit"
                  className="btn px-5 py-2 rounded-pill fw-bold text-white shadow-sm"
                  style={{ backgroundColor: "#0f766e" }}
                  disabled={loading}
                >
                  {loading ? (ml ? "സമർപ്പിക്കുന്നു…" : "Submitting...") : (ml ? "അയൽക്കൂട്ട രജിസ്ട്രേഷൻ സമർപ്പിക്കുക →" : "Submit NHG Registration →")}
                </button>
              </div>
            </form>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default NHGRegister;
