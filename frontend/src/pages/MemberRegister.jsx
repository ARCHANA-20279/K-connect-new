import { useState } from "react";
import api from "../api";
import "./MemberRegister.css";

const MemberRegister = () => {
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
        err.response?.data?.message || "Failed to register member"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-register-page">
      <div className="member-register-card">

        <h2 className="member-register-title">
          Member Registration
        </h2>

        <p className="member-register-subtitle">
          Register a new K-Connect member
        </p>

      {message && (
  <div className="member-success">
    {message}
    <br />
    <strong>Member ID: {memberId}</strong>
  </div>
)}
        {error && (
          <div className="member-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="member-form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter member name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="member-form-group">
            <label>Address</label>
            <textarea
              name="address"
              placeholder="Enter member address"
              value={form.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="member-form-group">
            <label>Ward</label>
            <input
              type="text"
              name="ward"
              placeholder="Enter ward"
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
            {loading ? "Registering..." : "Register Member"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default MemberRegister;
