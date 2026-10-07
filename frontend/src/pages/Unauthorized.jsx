import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const Unauthorized = () => {
  const { i18n } = useTranslation();
  const isMl = i18n.language === "ml";
  const { user } = useAuth();

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-75 py-5 px-3"
      style={{ background: "#fffdf7" }}
    >
      <div
        className="card shadow-sm border-0 text-center p-4 p-md-5"
        style={{
          maxWidth: "500px",
          width: "100%",
          borderRadius: "20px",
          background: "#ffffff",
          border: "1px solid #dfe8e2",
        }}
      >
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "#fef3c7",
            color: "#d97706",
            fontSize: "28px",
          }}
        >
          🔒
        </div>

        <h3 className="fw-bolder text-dark mb-2">
          {isMl ? "അനുമതിയില്ല" : "Access Restricted"}
        </h3>

        <p className="text-muted small mb-4 lh-base">
          {isMl
            ? "നിങ്ങളുടെ നിലവിലെ അക്കൗണ്ട് റോളിന് ഈ വിഭാഗം കാണുന്നതിനുള്ള അനുമതിയില്ല. കൂടുതൽ വിവരങ്ങൾക്ക് അഡ്മിനെ സമീപിക്കുക."
            : "Your account does not have permission to access this section. Please return to your role workspace."}
        </p>

        {user && (
          <div
            className="p-3 rounded-3 mb-4 text-start small"
            style={{ background: "#e8f5ee", border: "1px solid #c8e6d4" }}
          >
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Logged In User:</span>
              <strong className="text-dark">{user.name}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Current Role:</span>
              <span className="badge bg-success">{user.role}</span>
            </div>
          </div>
        )}

        <div className="d-flex justify-content-center gap-2">
          <Link
            to="/dashboard"
            className="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm"
            style={{ background: "#3faf7a", borderColor: "#3faf7a" }}
          >
            {isMl ? "ഡാഷ്‌ബോർഡിലേക്ക് മടങ്ങുക" : "Return to Dashboard"} →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
