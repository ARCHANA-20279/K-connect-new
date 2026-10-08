import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const MemberList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isSecretary = ["secretary", "nhg_secretary"].includes(role);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editingMember, setEditingMember] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    ward: "",
  });

  // =========================
  // FETCH MEMBERS
  // =========================
  const fetchMembers = async () => {
    try {
      const { data } = await api.get("/members");

      setMembers(data.members);
    } catch (err) {
      console.error("Fetch members error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to fetch members"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // =========================
  // EDIT MEMBER
  // =========================
  const handleEdit = (member) => {
    setEditingMember(member);

    setEditForm({
      name: member.name,
      phone: member.phone,
      email: member.email || "",
      address: member.address,
      ward: member.ward,
    });
  };

  // =========================
  // HANDLE EDIT INPUT
  // =========================
  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // UPDATE MEMBER
  // =========================
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const { data } = await api.put(
        `/members/${editingMember._id}`,
        editForm
      );

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member._id === editingMember._id
            ? data.member
            : member
        )
      );

      setEditingMember(null);

      alert("Member updated successfully");
    } catch (err) {
      console.error("Update member error:", err);

      alert(
        err.response?.data?.message ||
          "Failed to update member"
      );
    }
  };

  // =========================
  // DEACTIVATE MEMBER
  // =========================
  const handleDeactivate = async (member) => {
    const confirmDeactivate = window.confirm(
      `Are you sure you want to deactivate ${member.name}?`
    );

    if (!confirmDeactivate) {
      return;
    }

    try {
      const { data } = await api.put(
        `/members/${member._id}/deactivate`
      );

      setMembers((currentMembers) =>
        currentMembers.map((item) =>
          item._id === member._id
            ? data.member
            : item
        )
      );

      alert("Member deactivated successfully");
    } catch (err) {
      console.error(
        "Deactivate member error:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to deactivate member"
      );
    }
  };

  const handleApprove = async (member) => {
    try {
      const { data } = await api.put(`/members/${member._id}/approve`);
      setMembers((current) => current.map((item) => item._id === member._id ? data.member : item));
      alert(data.message || "Membership approved. The member can now sign in.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve membership");
    }
  };

  const handleReject = async (member) => {
    const reason = window.prompt(`Reason for declining ${member.name}'s membership request (optional):`);
    if (reason === null) return;
    try {
      const { data } = await api.put(`/members/${member._id}/reject`, { reason });
      setMembers((current) => current.map((item) => item._id === member._id ? data.member : item));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to decline membership request");
    }
  };

  // =========================
  // SEARCH MEMBERS
  // =========================
  const filteredMembers = members.filter((member) => {
    const searchText = search.toLowerCase();

    return (
      member.memberId
        .toLowerCase()
        .includes(searchText) ||
      member.name
        .toLowerCase()
        .includes(searchText) ||
      member.phone.includes(searchText)
    );
  });

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <p className="text-center mt-5">
        Loading members...
      </p>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error) {
    return (
      <div className="alert alert-danger m-4">
        {error}
      </div>
    );
  }

  // =========================
  // MAIN PAGE
  // =========================
  return (
    <div className="container py-4">

      {/* PAGE HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 p-3 bg-white border rounded-3 shadow-sm">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 className="fw-bold mb-0 text-primary">{t("membersHeroTitle")}</h2>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">
              {filteredMembers.length} {t("navMembers")}
            </span>
          </div>
          <p className="text-muted small mb-0">
            {t("membersHeroSubtitle")}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <input
            type="text"
            className="form-control"
            placeholder={t("search")}
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{ minWidth: "220px" }}
          />

          {isSecretary ? (
            <Link to="/member-register" className="btn btn-primary fw-semibold text-nowrap">
              {t("registerMemberBtn")}
            </Link>
          ) : user ? (
            <span className="badge bg-light text-primary border px-3 py-2 text-nowrap">
              {t("memberViewBadge")}
            </span>
          ) : (
            <Link to="/login" className="btn btn-outline-primary text-nowrap">
              🔒 {t("login")}
            </Link>
          )}
        </div>
      </div>

      {/* =========================
          EDIT FORM
      ========================= */}
      {editingMember && (
        <div className="card p-4 mb-4 shadow-sm">

          <h4 className="mb-3">
            Edit Member -{" "}
            {editingMember.memberId}
          </h4>

          <form onSubmit={handleUpdate}>

            {/* NAME */}
            <div className="mb-3">

              <label className="form-label">
                Name
              </label>

              <input
                type="text"
                name="name"
                className="form-control"
                value={editForm.name}
                onChange={handleEditChange}
                required
              />

            </div>

            {/* PHONE */}
            <div className="mb-3">

              <label className="form-label">
                Phone
              </label>

              <input
                type="tel"
                name="phone"
                className="form-control"
                value={editForm.phone}
                onChange={handleEditChange}
                required
              />

            </div>

            {/* EMAIL */}
            <div className="mb-3">

              <label className="form-label">
                Email
              </label>

              <input
                type="email"
                name="email"
                className="form-control"
                value={editForm.email}
                onChange={handleEditChange}
              />

            </div>

            {/* ADDRESS */}
            <div className="mb-3">

              <label className="form-label">
                Address
              </label>

              <textarea
                name="address"
                className="form-control"
                value={editForm.address}
                onChange={handleEditChange}
                required
              />

            </div>

            {/* WARD */}
            <div className="mb-3">

              <label className="form-label">
                Ward
              </label>

              <input
                type="text"
                name="ward"
                className="form-control"
                value={editForm.ward}
                onChange={handleEditChange}
                required
              />

            </div>

            {/* SAVE BUTTON */}
            <button
              type="submit"
              className="btn btn-success me-2"
            >
              Save Changes
            </button>

            {/* CANCEL BUTTON */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setEditingMember(null)
              }
            >
              Cancel
            </button>

          </form>

        </div>
      )}

      {/* =========================
          MEMBER TABLE
      ========================= */}

      {filteredMembers.length === 0 ? (

        <p>No members found.</p>

      ) : (

        <div className="table-responsive">

          <table className="table table-bordered table-striped">

            <thead>
              <tr>
                <th>{t("memberIdLabel")}</th>
                <th>{t("memberNameLabel")}</th>
                <th>{t("phone")}</th>
                <th>{t("email")}</th>
                <th>{t("addressLabel")}</th>
                <th>{t("wardLabel")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member._id}>
                  {/* MEMBER ID */}
                  <td className="fw-bold text-primary">
                    {member.memberId}
                  </td>

                  {/* NAME */}
                  <td>
                    {member.name}
                  </td>

                  {/* PHONE */}
                  <td>
                    {member.phone}
                  </td>

                  {/* EMAIL */}
                  <td>
                    {member.email || "-"}
                  </td>

                  {/* ADDRESS */}
                  <td>
                    {member.address}
                  </td>

                  {/* WARD */}
                  <td>
                    {member.ward}
                  </td>

                  {/* STATUS */}
                  <td>
                    <span className={`badge ${member.status === "Active" ? "bg-success" : member.status === "Pending" ? "bg-warning text-dark" : member.status === "Rejected" ? "bg-danger" : "bg-secondary"}`}>
                      {member.status === "Pending" ? "Awaiting secretary approval" : member.status === "Rejected" ? "Not approved" : member.status === "Active" ? t("active") : t("inactive")}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td>
                    {isSecretary ? (
                      <div className="d-flex flex-column gap-1">
                        {member.status === "Pending" && <>
                          <button type="button" className="btn btn-success btn-sm" onClick={() => handleApprove(member)}>✓ Approve member</button>
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleReject(member)}>Decline request</button>
                        </>}
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEdit(member)}
                        >
                          ✏️ {t("edit")}
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeactivate(member)}
                          disabled={member.status !== "Active"}
                        >
                          {member.status === "Inactive"
                            ? t("inactive")
                            : t("deactivateBtn")}
                        </button>
                      </div>
                    ) : (
                      <span className="badge bg-light text-secondary border small">
                        {t("readOnlyNotice").slice(0, 20)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      )}

    </div>
  );
};

export default MemberList;
