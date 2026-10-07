import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { user } = useAuth();

  const services = [
    {
      id: "s1",
      title: "Member Management",
      desc: "Manage NHG members",
      icon: "👥",
      iconBg: "#dcfce7", // Light green
      iconColor: "#16a34a",
      link: user ? "/members" : "/login",
    },
    {
      id: "s2",
      title: "Meeting Attendance",
      desc: "Scan meeting QR to mark attendance",
      icon: "📅",
      iconBg: "#f3e8ff", // Light purple
      iconColor: "#9333ea",
      link: user ? "/attendance" : "/login",
    },
    {
      id: "s3",
      title: "Savings & Passbook",
      desc: "Track savings and contributions",
      icon: "₹",
      iconBg: "#ffedd5", // Light orange
      iconColor: "#ea580c",
      link: user ? "/thrift" : "/login",
    },
    {
      id: "s4",
      title: "Loan Management",
      desc: "Apply and track loans",
      icon: "💰",
      iconBg: "#e0f2fe", // Light blue
      iconColor: "#0284c7",
      link: user ? "/loans" : "/login",
    },
    {
      id: "s5",
      title: "Notices & Updates",
      desc: "Important NHG announcements",
      icon: "📢",
      iconBg: "#fce7f3", // Light pink
      iconColor: "#db2777",
      link: user ? "/circulars" : "/login",
    },
    {
      id: "s6",
      title: "Community Dashboard",
      desc: "View community statistics",
      icon: "📊",
      iconBg: "#ccfbf1", // Light teal
      iconColor: "#0d9488",
      link: user ? "/dashboard" : "/login",
    },
  ];

  const updates = [
    {
      id: "u1",
      icon: "📅",
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
      title: "Weekly Ayalkoottam",
      date: "26 Sep 2026",
      desc: "This week's Ayalkoottam meeting will be held at the community hall.",
    },
    {
      id: "u2",
      icon: "📄",
      iconBg: "#ede9fe",
      iconColor: "#7c3aed",
      title: "Loan Application Updates",
      date: "24 Sep 2026",
      desc: "New loan applications are now open for eligible members.",
    },
    {
      id: "u3",
      icon: "🔔",
      iconBg: "#fee2e2",
      iconColor: "#ef4444",
      title: "CDS Notices",
      date: "22 Sep 2026",
      desc: "Important notice regarding upcoming training session for NHG members.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b" }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
          padding: "48px 0 36px 0",
        }}
      >
        <div className="container">
          <div className="row align-items-center g-4">
            {/* Left Content */}
            <div className="col-lg-6">
              <h1
                className="fw-bold mb-3"
                style={{
                  fontSize: "36px",
                  lineHeight: "1.25",
                  color: "#0f766e",
                  letterSpacing: "-0.5px",
                }}
              >
                Connecting Our Community,
                <br />
                Simplifying Every Day.
              </h1>

              <p
                className="text-secondary mb-4"
                style={{ fontSize: "16px", lineHeight: "1.6", maxWidth: "520px" }}
              >
                K-Connect brings Kudumbashree NHG members, meetings, attendance, savings, loans and notices into one easy-to-use digital platform.
              </p>

              {/* Action Buttons */}
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <Link
                  to={user ? "/dashboard" : "/login"}
                  className="btn px-4 py-2 rounded-pill fw-semibold shadow-sm text-white d-flex align-items-center gap-2"
                  style={{ backgroundColor: "#0f766e", border: "1px solid #0f766e" }}
                >
                  <span>👤 Member / Admin Login</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/register-nhg"
                  className="btn px-4 py-2 rounded-pill fw-semibold d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0f766e",
                    border: "1px solid #0f766e",
                  }}
                >
                  <span>👥 Join Our NHG</span>
                </Link>
              </div>
            </div>

            {/* Right Illustration Image */}
            <div className="col-lg-6 text-center text-lg-end">
              <img
                src="/kudumbashree-hero.png"
                alt="Kudumbashree NHG Community"
                className="img-fluid rounded-4 shadow-sm"
                style={{
                  maxHeight: "300px",
                  objectFit: "contain",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. SERVICES SECTION */}
      <section id="services" style={{ padding: "40px 0", backgroundColor: "#ffffff" }}>
        <div className="container">
          <div className="row g-3">
            {services.map((item) => (
              <div className="col-lg-2 col-md-4 col-sm-6" key={item.id}>
                <Link
                  to={item.link}
                  className="card h-100 text-decoration-none p-3 text-center border-0 shadow-sm"
                  style={{
                    borderRadius: "16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #f1f5f9",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(15, 118, 110, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                  }}
                >
                  <div
                    className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: item.iconBg,
                      color: item.iconColor,
                      fontSize: "22px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <h6
                    className="fw-bold mb-1"
                    style={{ fontSize: "14px", color: "#1e293b" }}
                  >
                    {item.title}
                  </h6>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: "12px", lineHeight: "1.4" }}
                  >
                    {item.desc}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. LATEST UPDATES SECTION */}
      <section
        id="notices"
        style={{
          padding: "36px 0",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div className="container">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "20px" }}>📢</span>
              <h5 className="fw-bold mb-0" style={{ color: "#0f766e" }}>
                Latest Updates
              </h5>
            </div>
            <Link
              to={user ? "/circulars" : "/login"}
              className="fw-semibold text-decoration-none small"
              style={{ color: "#0f766e" }}
            >
              View All →
            </Link>
          </div>

          {/* Updates Cards Row */}
          <div className="row g-3">
            {updates.map((up) => (
              <div className="col-md-4" key={up.id}>
                <div
                  className="card p-3 border-0 shadow-sm h-100"
                  style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "42px",
                        height: "42px",
                        backgroundColor: up.iconBg,
                        color: up.iconColor,
                        fontSize: "18px",
                      }}
                    >
                      {up.icon}
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                        {up.title}
                      </h6>
                      <small className="text-muted d-block mb-1" style={{ fontSize: "12px" }}>
                        {up.date}
                      </small>
                      <p className="text-secondary small mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                        {up.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION */}
      <section id="about" style={{ padding: "48px 0", backgroundColor: "#ffffff" }}>
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-md-6">
              <div
                className="p-4 rounded-4"
                style={{ backgroundColor: "#ecfdf5", border: "1px solid #d1fae5" }}
              >
                <span className="badge bg-success mb-2 px-3 py-1 rounded-pill">
                  About K-Connect
                </span>
                <h4 className="fw-bold" style={{ color: "#065f46" }}>
                  Empowering Kudumbashree NHGs Together
                </h4>
                <p className="text-secondary small mb-0" style={{ lineHeight: "1.6" }}>
                  Kudumbashree Neighbourhood Groups (NHGs) are the cornerstone of community solidarity and women's empowerment across Kerala. K-Connect provides a single, unified digital hub where each NHG operates with its own private data, members, attendance registers, savings ledgers, and loan records.
                </p>
              </div>
            </div>

            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="p-3 rounded-3 border bg-light">
                    <div className="fs-4 mb-1">🏛️</div>
                    <h6 className="fw-bold mb-1">Multi-NHG Platform</h6>
                    <p className="small text-muted mb-0">
                      Independent data isolation for Deepam, Sneha, Jyothi, and all registered NHGs.
                    </p>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded-3 border bg-light">
                    <div className="fs-4 mb-1">📱</div>
                    <h6 className="fw-bold mb-1">Smart QR Attendance</h6>
                    <p className="small text-muted mb-0">
                      Generate Meeting QR codes for contactless attendance scanning on phones.
                    </p>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded-3 border bg-light">
                    <div className="fs-4 mb-1">💳</div>
                    <h6 className="fw-bold mb-1">Digital Passbooks</h6>
                    <p className="small text-muted mb-0">
                      Real-time thrift savings records and instant digital receipts for members.
                    </p>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded-3 border bg-light">
                    <div className="fs-4 mb-1">🛡️</div>
                    <h6 className="fw-bold mb-1">Admin Verification</h6>
                    <p className="small text-muted mb-0">
                      Secure onboarding workflow with Main Admin review and approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CONTACT / REGISTRATION CALLOUT */}
      <section
        id="contact"
        style={{
          padding: "40px 0",
          backgroundColor: "#f0fdf4",
          borderTop: "1px solid #d1fae5",
        }}
      >
        <div className="container text-center">
          <h4 className="fw-bold mb-2" style={{ color: "#065f46" }}>
            Ready to bring your Kudumbashree NHG online?
          </h4>
          <p className="text-secondary small max-w-600 mx-auto mb-4" style={{ maxWidth: "560px" }}>
            Submit your NHG registration in minutes. Once verified by our Main Admin, your Secretary can instantly begin managing meetings, savings, and loans.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link
              to="/register-nhg"
              className="btn px-4 py-2 rounded-pill fw-bold text-white shadow-sm"
              style={{ backgroundColor: "#0f766e" }}
            >
              🌱 Register New NHG
            </Link>
            <Link
              to="/login"
              className="btn px-4 py-2 rounded-pill fw-semibold btn-outline-secondary"
            >
              🔑 Sign In to Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
