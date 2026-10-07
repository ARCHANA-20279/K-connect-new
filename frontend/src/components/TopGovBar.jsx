import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const TopGovBar = () => {
  const { i18n } = useTranslation();
  const isMl = i18n.language === "ml";
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      setTimeStr(now.toLocaleDateString(isMl ? "ml-IN" : "en-IN", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [isMl]);

  return (
    <div className="gov-top-bar">
      <div className="container-fluid px-3 px-lg-4 d-flex justify-content-between align-items-center flex-wrap">
        {/* LEFT: GOVT OF KERALA & KUDUMBASHREE TAG */}
        <div className="d-flex align-items-center gap-2 py-1">
          <span className="gov-emblem-badge">🏛️</span>
          <span className="gov-text-primary">
            {isMl
              ? "കേരള സർക്കാർ • തദ്ദേശ സ്വയംഭരണ വകുപ്പ് (LSGD)"
              : "Government of Kerala • Local Self Government Dept (LSGD)"}
          </span>
          <span className="gov-divider d-none d-md-inline">•</span>
          <span className="gov-text-secondary d-none d-md-inline">
            {isMl
              ? "കുടുംബശ്രീ സംസ്ഥാന ദാരിദ്ര്യ നിർമ്മാർജ്ജന മിഷൻ"
              : "Kudumbashree State Poverty Eradication Mission"}
          </span>
        </div>

        {/* RIGHT: TIME, HELPLINE & QUICK TAG */}
        <div className="d-flex align-items-center gap-3 py-1 small">
          <div className="d-none d-lg-flex align-items-center gap-1 text-white-50">
            <span>🕒</span>
            <span>{timeStr}</span>
          </div>
          <div className="d-flex align-items-center gap-1 gov-helpline">
            <span>📞</span>
            <span>
              {isMl ? "സി.ഡി.എസ് ഹെൽപ്പ്‌ലൈൻ: " : "CDS Helpline: "}
              <strong>1800-425-4567</strong>
            </span>
          </div>
          <span className="gov-badge-official d-none d-sm-inline">
            {isMl ? "ഔദ്യോഗിക പോർട്ടൽ" : "Official Portal"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopGovBar;
