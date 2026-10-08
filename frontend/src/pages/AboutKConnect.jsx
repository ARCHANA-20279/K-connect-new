import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import "./AboutKConnect.css";

const AboutIcon = ({ name }) => {
  const common = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "community") return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 15a4.5 4.5 0 0 1 6.5 4"/></svg>;
  if (name === "structure") return <svg {...common}><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/><path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg>;
  if (name === "digital") return <svg {...common}><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M10 5h4M10 18.5h4M9 9h6M9 12h6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></svg>;
};

const AboutKConnect = () => {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const ml = i18n.resolvedLanguage === "ml" || i18n.language === "ml";

  const steps = ml
    ? [
        { icon: "community", eyebrow: "കുടുംബശ്രീയെ അറിയാം", title: "കുടുംബശ്രീ എന്താണ്?", text: "കേരളത്തിലെ സ്ത്രീകളുടെ നേതൃത്വത്തിലുള്ള അയൽക്കൂട്ട ശൃംഖലയാണ് കുടുംബശ്രീ. കൂട്ടായ്മയിലൂടെ സാമൂഹികവും സാമ്പത്തികവുമായ മുന്നേറ്റത്തിനും പ്രാദേശിക വികസനത്തിനും ഇത് പിന്തുണ നൽകുന്നു." },
        { icon: "structure", eyebrow: "മൂന്ന് തലത്തിലുള്ള ഘടന", title: "എൻ.എച്ച്.ജി, എ.ഡി.എസ്, സി.ഡി.എസ്", text: "അയൽക്കൂട്ടം (എൻ.എച്ച്.ജി) അടിസ്ഥാന ഘടകമാണ്. അയൽക്കൂട്ടങ്ങൾ ചേർന്ന് ഏരിയ ഡെവലപ്മെന്റ് സൊസൈറ്റി (എ.ഡി.എസ്), തുടർന്ന് കമ്മ്യൂണിറ്റി ഡെവലപ്മെന്റ് സൊസൈറ്റി (സി.ഡി.എസ്) രൂപപ്പെടുന്നു." },
        { icon: "digital", eyebrow: "കെ-കണക്ടിനെ അറിയാം", title: "ഒരിടത്ത് ഒരുമിച്ചുള്ള ഡിജിറ്റൽ സേവനങ്ങൾ", text: "യോഗങ്ങളും ഹാജറും, അംഗങ്ങളുടെ സമ്പാദ്യ പാസ്ബുക്കുകളും, വായ്പാ നടപടികളുടെ നിലവാരവും, അറിയിപ്പുകളും സമൂഹ ജോലികളും കെ-കണക്ടിൽ കൈകാര്യം ചെയ്യാം." },
        { icon: "start", eyebrow: "എങ്ങനെ തുടങ്ങാം", title: "നിങ്ങളുടെ പദവിക്ക് അനുയോജ്യമായ വിഭാഗം തുറക്കുക", text: "അംഗങ്ങൾക്ക് സ്വന്തം വിവരങ്ങളും പാസ്ബുക്കും വായ്പാ അപേക്ഷകളും കാണാം. സെക്രട്ടറിമാർ എൻ.എച്ച്.ജി രേഖകളും യോഗങ്ങളും കൈകാര്യം ചെയ്യുന്നു. എ.ഡി.എസ് / സി.ഡി.എസ് ഉദ്യോഗസ്ഥർക്ക് അനുവദിച്ച പരിശോധനാ ചുമതലകൾ ലഭിക്കും. ഔദ്യോഗിക തീരുമാനങ്ങൾ ബന്ധപ്പെട്ട സമിതികളും ഉദ്യോഗസ്ഥരുമാണ് എടുക്കുന്നത്." },
      ]
    : [
        { icon: "community", eyebrow: "ABOUT KUDUMBASHREE", title: "What is Kudumbashree?", text: "Kudumbashree is Kerala’s women-led community network. Through collective action, it supports social and economic progress and local development." },
        { icon: "structure", eyebrow: "A THREE-TIER STRUCTURE", title: "NHG, ADS and CDS", text: "Neighbourhood Groups (NHGs) are the base. NHGs come together as Area Development Societies (ADS), which in turn are represented through Community Development Societies (CDS)." },
        { icon: "digital", eyebrow: "ABOUT K-CONNECT", title: "Community tools in one place", text: "K-Connect brings together meeting and attendance records, member thrift passbooks, loan workflow updates, notices and community jobs." },
        { icon: "start", eyebrow: "GETTING STARTED", title: "Open the workspace for your role", text: "Members can view their own records and applications. Secretaries manage NHG records and meetings. ADS/CDS officers see the review tasks assigned to them. Official decisions remain with the authorized group and officers." },
      ];

  const leaveIntro = () => navigate(user ? "/dashboard" : "/login");
  const current = steps[step];

  return (
    <main className="kc-about-page">
      <section className="kc-about-card" aria-labelledby="about-title">
        <div className="kc-about-topline">
          <span>{ml ? "കെ-കണക്ട് പരിചയപ്പെടുത്തൽ" : "K-CONNECT INTRODUCTION"}</span>
          <button type="button" className="kc-about-skip" onClick={leaveIntro}>
            {ml ? "ഒഴിവാക്കി തുടരുക" : "Skip introduction"} <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="kc-about-progress" role="progressbar" aria-label={ml ? "പരിചയപ്പെടുത്തൽ പുരോഗതി" : "Introduction progress"} aria-valuemin="1" aria-valuemax={steps.length} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="kc-about-content" key={step}>
          <div className="kc-about-icon"><AboutIcon name={current.icon} /></div>
          <p className="kc-about-eyebrow">{current.eyebrow}</p>
          <h1 id="about-title">{current.title}</h1>
          <p className="kc-about-copy">{current.text}</p>
        </div>

        <div className="kc-about-step-label" aria-live="polite">
          {ml ? `${steps.length}-ൽ ${step + 1} ഘട്ടം` : `Step ${step + 1} of ${steps.length}`}
          <div className="kc-about-dots" aria-hidden="true">
            {steps.map((item, index) => <span className={index === step ? "is-active" : ""} key={item.title} />)}
          </div>
        </div>

        <div className="kc-about-actions">
          <button type="button" className="kc-about-back" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
            {ml ? "← മുമ്പത്തെത്" : "← Back"}
          </button>
          {step < steps.length - 1 ? (
            <button type="button" className="kc-about-next" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>
              {ml ? "അടുത്തത്" : "Next"} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button type="button" className="kc-about-next" onClick={leaveIntro}>
              {ml ? "കെ-കണക്ടിലേക്ക് പോകുക" : "Continue to K-Connect"} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        <p className="kc-about-source">
          {ml ? "കുടുംബശ്രീയുടെ ഔദ്യോഗിക വെബ്സൈറ്റിൽ കൂടുതൽ വായിക്കുക:" : "Learn more from the official Kudumbashree website:"}{" "}
          <a href="https://www.kudumbashree.org/pages/9" target="_blank" rel="noreferrer">{ml ? "കമ്മ്യൂണിറ്റി ഘടന" : "Community Structure"} ↗</a>
        </p>
        <div className="kc-about-footer"><Link to={user ? "/dashboard" : "/login"}>{ml ? "കെ-കണക്ട്" : "K-Connect"}</Link><span>{ml ? "കുടുംബശ്രീ കമ്മ്യൂണിറ്റികൾക്കായുള്ള ഡിജിറ്റൽ പ്ലാറ്റ്ഫോം" : "A digital platform for Kudumbashree communities"}</span></div>
      </section>
    </main>
  );
};

export default AboutKConnect;
