import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import "./MemberRegister.css";

const MemberRegister = () => {
  const { i18n } = useTranslation();
  const ml = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ml");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    ward: "",
  });

  const [message, setMessage] = useState("");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setMemberId("");
    setLoading(true);

    try {
      const { data } = await api.post("/members", form);

      setMessage(data.message);
      setMemberId(data.member.memberId);

      setForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        ward: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message || (ml ? "അംഗത്തെ രജിസ്റ്റർ ചെയ്യാനായില്ല" : "Failed to register member")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-register-page">
      <div className="member-register-card">

        <h2 className="member-register-title">
          {ml ? "അംഗ രജിസ്ട്രേഷൻ" : "Member Registration"}
        </h2>

        <p className="member-register-subtitle">
          {ml ? "പുതിയ കെ-കണക്ട് അംഗത്തെ രജിസ്റ്റർ ചെയ്യുക" : "Register a new K-Connect member"}
        </p>

      {message && (
  <div className="member-success">
    {message}
    <br />
            <strong>{ml ? "അംഗ ഐഡി" : "Member ID"}: {memberId}</strong>
  </div>
)}
        {error && (
          <div className="member-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="member-form-group">
            <label>{ml ? "പേര്" : "Name"}</label>
            <input
              type="text"
              name="name"
              placeholder={ml ? "അംഗത്തിന്റെ പേര് നൽകുക" : "Enter member name"}
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>{ml ? "ഫോൺ" : "Phone"}</label>
            <input
              type="tel"
              name="phone"
              placeholder={ml ? "ഫോൺ നമ്പർ നൽകുക" : "Enter phone number"}
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>{ml ? "ഇമെയിൽ" : "Email"}</label>
            <input
              type="email"
              name="email"
              placeholder={ml ? "ഇമെയിൽ വിലാസം നൽകുക" : "Enter email address"}
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="member-form-group">
            <label>{ml ? "വിലാസം" : "Address"}</label>
            <textarea
              name="address"
              placeholder={ml ? "അംഗത്തിന്റെ വിലാസം നൽകുക" : "Enter member address"}
              value={form.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>{ml ? "വാർഡ്" : "Ward"}</label>
            <input
              type="text"
              name="ward"
              placeholder={ml ? "വാർഡ് നൽകുക" : "Enter ward"}
              value={form.ward}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="member-register-button"
            disabled={loading}
          >
            {loading ? (ml ? "രജിസ്റ്റർ ചെയ്യുന്നു…" : "Registering...") : (ml ? "അംഗത്തെ രജിസ്റ്റർ ചെയ്യുക" : "Register Member")}
          </button>

        </form>
      </div>
    </div>
  );
};

export default MemberRegister;
