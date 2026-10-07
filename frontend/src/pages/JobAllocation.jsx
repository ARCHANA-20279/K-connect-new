import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const emptyTask = () => ({ taskName: "", assignedMemberId: "", deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), stipendAmount: "0", description: "" });
const emptyJob = () => ({ projectName: "", category: "Catering & Food", tasks: [emptyTask()] });

const JobAllocation = () => {
  const { user } = useAuth();
  const isSecretary = ["secretary", "nhg_secretary"].includes((user?.role || "").toLowerCase());
  const isMember = (user?.role || "").toLowerCase() === "member";
  const [jobs, setJobs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyJob());
  const [declineJob, setDeclineJob] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reassignTo, setReassignTo] = useState({});

  const fetchData = async () => {
    try {
      const jobsRes = await api.get("/jobs");
      setLoadError("");
      setJobs(jobsRes.data.jobs || []);
      if (isSecretary) {
        const membersRes = await api.get("/members");
        const active = (membersRes.data.members || []).filter((member) => member.status === "Active");
        setMembers(active);
      }
    } catch (err) {
      console.error("Failed to load community jobs:", err);
      setLoadError(err.response?.data?.message || "Could not load Community Jobs. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const timer = window.setInterval(fetchData, 20000);
    return () => window.clearInterval(timer);
  }, [isSecretary]);

  const updateTask = (index, changes) => setForm((current) => ({
    ...current,
    tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...changes } : task),
  }));

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await api.post("/jobs", {
        projectName: form.projectName,
        category: form.category,
        tasks: form.tasks.map((task) => ({ ...task, stipendAmount: Number(task.stipendAmount) || 0 })),
      });
      setShowModal(false);
      setForm(emptyJob());
      await fetchData();
      alert("Project tasks assigned. Each member has been notified of their own task.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to allocate the job.");
    }
  };

  const respond = async (job, action, reason = "") => {
    try {
      await api.patch(`/jobs/${job._id}/respond`, { action, reason });
      setDeclineJob(null);
      setDeclineReason("");
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update this job.");
    }
  };

  const submitDecline = async (event) => {
    event.preventDefault();
    if (declineJob) await respond(declineJob, "not_interested", declineReason);
  };

  const reassign = async (job) => {
    const assignedMemberId = reassignTo[job._id] || members.find((member) => member.memberId !== job.assignedMemberId)?.memberId;
    if (!assignedMemberId) return alert("Add another active member to your NHG before reassigning this job.");
    try {
      await api.patch(`/jobs/${job._id}/reassign`, { assignedMemberId });
      await fetchData();
      alert("Job reassigned. The new member has been notified.");
    } catch (err) {
      alert(err.response?.data?.message || "Could not reassign this job.");
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete “${job.taskName}” for ${job.assignedMemberName}?`)) return;
    try { await api.delete(`/jobs/${job._id}`); await fetchData(); }
    catch (err) { alert(err.response?.data?.message || "Could not delete this job."); }
  };

  const statusColor = { Assigned: "secondary", Interested: "info", "Not Interested": "danger", "In Progress": "warning", Submitted: "primary", Completed: "success" };
  const assignedCount = jobs.filter((job) => job.status === "Assigned").length;
  const declinedCount = jobs.filter((job) => job.status === "Not Interested").length;
  const completedCount = jobs.filter((job) => job.status === "Completed").length;

  return (
    <div className="portal-page-container"><div className="container">
      <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div><span className="portal-hero-tag">K-Connect • NHG Community Work</span><h1 className="portal-hero-title">💼 Community Jobs</h1>
          <p className="portal-hero-subtitle">{isSecretary ? "Assign community work, follow member responses, and reassign declined tasks." : "View your NHG work assignments, respond to the Secretary, and update progress when you finish."}</p></div>
        {isSecretary && <button className="btn btn-light text-primary fw-bold px-4 py-2" onClick={() => setShowModal(true)}>＋ Assign a job</button>}
      </div>

      {isSecretary && (declinedCount > 0 || completedCount > 0) && <div className="alert alert-info"><strong>Secretary update:</strong> {declinedCount} job{declinedCount === 1 ? "" : "s"} need reassignment · {completedCount} marked complete. This list refreshes automatically.</div>}
      {isMember && assignedCount > 0 && <div className="alert alert-primary" role="status"><strong>🔔 New job assignment{assignedCount === 1 ? "" : "s"}:</strong> You have {assignedCount} task{assignedCount === 1 ? "" : "s"} from your Secretary. Review each card and respond.</div>}
      {loadError && <div className="alert alert-danger" role="alert">{loadError}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="portal-kpi-card"><div className="portal-kpi-icon kpi-amber">📋</div><div><div className="portal-kpi-val">{jobs.length}</div><div className="portal-kpi-lbl">{isMember ? "Your assignments" : "NHG assignments"}</div></div></div></div>
        <div className="col-md-4"><div className="portal-kpi-card"><div className="portal-kpi-icon kpi-blue">⏳</div><div><div className="portal-kpi-val">{isMember ? assignedCount : declinedCount}</div><div className="portal-kpi-lbl">{isMember ? "Awaiting your response" : "Need Secretary action"}</div></div></div></div>
        <div className="col-md-4"><div className="portal-kpi-card"><div className="portal-kpi-icon kpi-emerald">✅</div><div><div className="portal-kpi-val">{completedCount}</div><div className="portal-kpi-lbl">Completed jobs</div></div></div></div>
      </div>

      {loading ? <div className="portal-card text-center py-5">Loading community jobs…</div> : jobs.length === 0 ? <div className="portal-card text-center py-5"><div className="fs-1">🧺</div><h4>No jobs assigned yet</h4><p className="text-muted mb-0">{isSecretary ? "Create a project, add work steps, and assign each step to a member." : "Your Secretary’s assignments will appear here, with a notification."}</p></div> :
        <div className="row g-3">{jobs.map((job) => <div className="col-12" key={job._id}>
          <article className={`portal-card border-start border-4 border-${statusColor[job.status] || "secondary"}`}>
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div className="flex-grow-1">{job.projectName && <div className="small text-uppercase fw-bold text-primary mb-1">Project: {job.projectName}</div>}<div className="d-flex flex-wrap align-items-center gap-2 mb-2"><h4 className="mb-0">{job.taskName}</h4><span className={`badge text-bg-${statusColor[job.status] || "secondary"}`}>{job.status}</span><span className="badge bg-light text-dark border">{job.category}</span></div>
                <p className="mb-2">{job.description || "Community assignment from the NHG Secretary."}</p>
                <div className="small text-muted">Assigned to <strong>{job.assignedMemberName}</strong> ({job.assignedMemberId}) · Due {job.deadline} · Remuneration ₹{Number(job.stipendAmount || 0).toLocaleString()}</div>
                {job.status === "Not Interested" && <div className="alert alert-danger py-2 mt-3 mb-0"><strong>{job.assignedMemberName} declined:</strong> {job.declineReason}</div>}
              </div>
              {isMember && <div className="d-flex flex-wrap align-items-start gap-2">
                {job.status === "Assigned" && <><button className="btn btn-success" onClick={() => respond(job, "interested")}>I’m interested</button><button className="btn btn-outline-danger" onClick={() => { setDeclineJob(job); setDeclineReason(""); }}>Not interested</button></>}
                {job.status === "Interested" && <button className="btn btn-primary" onClick={() => respond(job, "start")}>Start this job</button>}
                {job.status === "In Progress" && <button className="btn btn-success" onClick={() => respond(job, "complete")}>✓ Mark job done</button>}
                {job.status === "Completed" && <span className="text-success fw-semibold">✓ You marked this job done</span>}
              </div>}
              {isSecretary && <div className="d-flex flex-column gap-2" style={{ minWidth: 230 }}>
                {job.status === "Not Interested" && <><label className="small fw-semibold">Reassign to</label><select className="form-select" value={reassignTo[job._id] || ""} onChange={(event) => setReassignTo({ ...reassignTo, [job._id]: event.target.value })}><option value="">Select a member</option>{members.filter((member) => member.memberId !== job.assignedMemberId).map((member) => <option key={member.memberId} value={member.memberId}>{member.name} ({member.memberId})</option>)}</select><button className="btn btn-primary" onClick={() => reassign(job)}>Reassign job</button></>}
                <button className="btn btn-sm btn-outline-secondary" onClick={() => deleteJob(job)}>Delete assignment</button>
              </div>}
            </div>
          </article>
        </div>)}</div>}
    </div>

    {showModal && <div className="custom-modal-backdrop"><div className="custom-modal-card" style={{ maxWidth: 760 }}><div className="custom-modal-header"><h5 className="custom-modal-title">💼 Create project and assign work</h5><button type="button" className="btn-close" onClick={() => setShowModal(false)} /></div>
      <form onSubmit={handleCreate}><div className="custom-modal-body">
        <label className="form-label fw-semibold">Project / production name *</label><input className="form-control mb-3" placeholder="For example: Mango pickle production" value={form.projectName} onChange={(event) => setForm({ ...form, projectName: event.target.value })} required />
        <label className="form-label fw-semibold">Project category</label><select className="form-select mb-3" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Catering & Food</option><option>Tailoring & Apparel</option><option>Waste Management</option><option>Organic Farming</option><option>Event Management</option><option>Loan Collection Duty</option></select>
        <div className="d-flex justify-content-between align-items-center mb-2"><strong>Work steps and assignees</strong><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setForm((current) => ({ ...current, tasks: [...current.tasks, emptyTask()] }))}>＋ Add work step</button></div>
        <p className="small text-muted">Each step can go to a different member. For example, assign mango cutting to one person and packaging to another.</p>
        {form.tasks.map((task, index) => <div className="border rounded-3 p-3 mb-3 bg-light" key={index}>
          <div className="d-flex justify-content-between align-items-center mb-2"><strong>Step {index + 1}</strong>{form.tasks.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setForm((current) => ({ ...current, tasks: current.tasks.filter((_, taskIndex) => taskIndex !== index) }))}>Remove step</button>}</div>
          <div className="row g-2"><div className="col-md-6"><label className="form-label fw-semibold">Task *</label><input className="form-control" placeholder="Mango cutting" value={task.taskName} onChange={(event) => updateTask(index, { taskName: event.target.value })} required /></div><div className="col-md-6"><label className="form-label fw-semibold">Assign to member *</label><select className="form-select" value={task.assignedMemberId} onChange={(event) => updateTask(index, { assignedMemberId: event.target.value })} required><option value="">Choose a member</option>{members.map((member) => <option key={member.memberId} value={member.memberId}>{member.name} ({member.memberId})</option>)}</select></div><div className="col-sm-6"><label className="form-label fw-semibold">Deadline *</label><input type="date" className="form-control" value={task.deadline} onChange={(event) => updateTask(index, { deadline: event.target.value })} required /></div><div className="col-sm-6"><label className="form-label fw-semibold">Payment for this step (₹)</label><input type="number" min="0" className="form-control" value={task.stipendAmount} onChange={(event) => updateTask(index, { stipendAmount: event.target.value })} /></div><div className="col-12"><label className="form-label fw-semibold">Instructions</label><textarea className="form-control" rows="2" placeholder="Quantity, location, materials, or quality requirements" value={task.description} onChange={(event) => updateTask(index, { description: event.target.value })} /></div></div>
        </div>)}
      </div><div className="custom-modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Assign work steps and notify members</button></div></form>
    </div></div>}

    {declineJob && <div className="custom-modal-backdrop"><div className="custom-modal-card"><div className="custom-modal-header bg-danger text-white"><h5 className="custom-modal-title text-white">Not interested in this job</h5><button type="button" className="btn-close btn-close-white" onClick={() => setDeclineJob(null)} /></div><form onSubmit={submitDecline}><div className="custom-modal-body"><p>You’re declining <strong>{declineJob.taskName}</strong>. Your Secretary will see the reason and can reassign it.</p><label className="form-label fw-semibold">Reason *</label><textarea className="form-control" rows="4" minLength="5" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="For example: I am unavailable that week because…" required /></div><div className="custom-modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setDeclineJob(null)}>Cancel</button><button type="submit" className="btn btn-danger">Send reason to Secretary</button></div></form></div></div>}
    </div>
  );
};

export default JobAllocation;
