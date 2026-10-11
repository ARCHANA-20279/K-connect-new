import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { i18n } = useTranslation();
  const ml = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ml");
  return (
    <footer style={{ backgroundColor: "#0f4a3c", color: "#ffffff" }}>
      {/* Upper Footer Links */}
      <div className="container py-4">
        <div className="row g-4 align-items-center">
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2">
              <img src="/k-connect-mark.svg" alt="" width="34" height="34" />
              <div>
                <h5 className="fw-bold mb-0 text-white">K-Connect</h5>
                <small style={{ color: "#a7f3d0", fontSize: "12px" }}>
                  {ml ? "കുടുംബശ്രീ അയൽക്കൂട്ട പ്ലാറ്റ്ഫോം" : "Kudumbashree NHG Platform"}
                </small>
              </div>
            </div>
            <p className="small text-white-50 mt-2 mb-0" style={{ maxWidth: "300px" }}>
              {ml ? "ഡിജിറ്റൽ സഹകരണത്തിലൂടെ സ്വയംസഹായ അയൽക്കൂട്ടങ്ങളെ ശാക്തീകരിക്കുന്നു." : "Empowering grassroots self-help neighbourhood groups through digital collaboration."}
            </p>
          </div>

          <div className="col-md-4 text-center">
            <div className="d-flex justify-content-center gap-4 small">
              <Link to="/" className="text-white-50 text-decoration-none hover-white">{ml ? "ഹോം" : "Home"}</Link>
              <Link to="/about" className="text-white-50 text-decoration-none hover-white">{ml ? "കെ-കണക്ടിനെക്കുറിച്ച്" : "About K-Connect"}</Link>
              <a href="#services" className="text-white-50 text-decoration-none hover-white">{ml ? "സേവനങ്ങൾ" : "Services"}</a>
              <a href="#notices" className="text-white-50 text-decoration-none hover-white">{ml ? "അറിയിപ്പുകൾ" : "Notices"}</a>
              <Link to="/register-nhg" className="text-white-50 text-decoration-none hover-white">{ml ? "അയൽക്കൂട്ടം രജിസ്റ്റർ ചെയ്യുക" : "Register NHG"}</Link>
            </div>
            <div className="mt-2 text-white-50 small">
              {ml ? "സ്ത്രീശാക്തീകരണം • സമൂഹങ്ങളുടെ വളർച്ച" : "Empowering Women • Strengthening Communities"}
            </div>
          </div>

          <div className="col-md-4 text-md-end text-white-50 small">
            <div><strong>Kudumbashree Mission</strong></div>
            <div>{ml ? "തദ്ദേശ സ്വയംഭരണ വകുപ്പ്" : "Local Self Government Department"}</div>
            <div className="text-white-50">{ml ? "കേരള സർക്കാർ" : "Government of Kerala"}</div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div style={{ backgroundColor: "#0b372c", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="container py-2 d-flex justify-content-between align-items-center flex-wrap gap-2 text-white-50 small">
          <div>
            © {new Date().getFullYear()} K-Connect Kudumbashree Platform.
          </div>
          <div>
            {ml ? "കുടുംബശ്രീ | തദ്ദേശ സ്വയംഭരണം" : "Kudumbashree | Local Self Government"}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
