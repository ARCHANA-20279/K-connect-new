import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer style={{ backgroundColor: "#0f4a3c", color: "#ffffff" }}>
      {/* Upper Footer Links */}
      <div className="container py-4">
        <div className="row g-4 align-items-center">
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "24px" }}>🌱</span>
              <div>
                <h5 className="fw-bold mb-0 text-white">K-Connect</h5>
                <small style={{ color: "#a7f3d0", fontSize: "12px" }}>
                  Kudumbashree NHG Platform
                </small>
              </div>
            </div>
            <p className="small text-white-50 mt-2 mb-0" style={{ maxWidth: "300px" }}>
              Empowering grassroots self-help neighbourhood groups through digital collaboration.
            </p>
          </div>

          <div className="col-md-4 text-center">
            <div className="d-flex justify-content-center gap-4 small">
              <Link to="/" className="text-white-50 text-decoration-none hover-white">Home</Link>
              <a href="#about" className="text-white-50 text-decoration-none hover-white">About</a>
              <a href="#services" className="text-white-50 text-decoration-none hover-white">Services</a>
              <a href="#notices" className="text-white-50 text-decoration-none hover-white">Notices</a>
              <Link to="/register-nhg" className="text-white-50 text-decoration-none hover-white">Register NHG</Link>
            </div>
            <div className="mt-2 text-white-50 small">
              Empowering Women • Strengthening Communities
            </div>
          </div>

          <div className="col-md-4 text-md-end text-white-50 small">
            <div><strong>Kudumbashree Mission</strong></div>
            <div>Local Self Government Department</div>
            <div className="text-white-50">Government of Kerala</div>
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
            Kudumbashree | Local Self Government
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
