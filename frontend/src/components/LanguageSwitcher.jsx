import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("kconnect_language", lang);
  };

  const isMalayalam = i18n.language === "ml";

  return (
    <div className="btn-group btn-group-sm shadow-sm" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`btn ${!isMalayalam ? "btn-primary fw-bold" : "btn-outline-secondary bg-white text-dark"}`}
        onClick={() => handleLanguageChange("en")}
        title="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        className={`btn ${isMalayalam ? "btn-success fw-bold" : "btn-outline-secondary bg-white text-dark"}`}
        onClick={() => handleLanguageChange("ml")}
        title="മലയാളത്തിലേക്ക് മാറ്റുക"
      >
        മലയാളം
      </button>
    </div>
  );
};

export default LanguageSwitcher;
