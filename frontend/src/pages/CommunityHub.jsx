import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../portal.css";

const schemes = [
  { icon: "💰", title: "Thrift & internal credit", ml: "തുകയും ആഭ്യന്തര വായ്പയും", text: "NHG thrift and credit activities, bank linkage, financial literacy and related support information.", textMl: "എൻ.എച്ച്.ജി. സമ്പാദ്യം, ആഭ്യന്തര വായ്പ, ബാങ്ക് ലിങ്കേജ്, സാമ്പത്തിക സാക്ഷരത എന്നിവയെക്കുറിച്ചുള്ള വിവരങ്ങൾ.", url: "https://www.kudumbashree.org/pages/5", category: "Microfinance" },
  { icon: "🏦", title: "Bank linkage", ml: "ബാങ്ക് ലിങ്കേജ്", text: "Learn about NHG bank linkage and the documents or guidance published by Kudumbashree and partner institutions.", textMl: "എൻ.എച്ച്.ജി. ബാങ്ക് ലിങ്കേജിനെക്കുറിച്ചും ഔദ്യോഗികമായി പ്രസിദ്ധീകരിക്കുന്ന രേഖകളെക്കുറിച്ചും അറിയുക.", url: "https://www.kudumbashree.org/pages/5", category: "Finance" },
  { icon: "📚", title: "Financial literacy", ml: "സാമ്പത്തിക സാക്ഷരത", text: "Find official financial literacy and microfinance resources for NHG members.", textMl: "എൻ.എച്ച്.ജി. അംഗങ്ങൾക്കുള്ള ഔദ്യോഗിക സാമ്പത്തിക സാക്ഷരതാ വിവരങ്ങൾ കണ്ടെത്തുക.", url: "https://www.kudumbashree.org/pages/5", category: "Learning" },
  { icon: "🌾", title: "Enterprise & livelihoods", ml: "സംരംഭങ്ങളും ഉപജീവനവും", text: "Explore enterprise development, skill building and marketing support information.", textMl: "സംരംഭ വികസനം, നൈപുണ്യ പരിശീലനം, വിപണന പിന്തുണ എന്നിവയെക്കുറിച്ചുള്ള വിവരങ്ങൾ കാണുക.", url: "https://www.kudumbashree.org/pages/512", category: "Enterprise" },
  { icon: "🌱", title: "Collective farming", ml: "കൂട്ടുകൃഷി", text: "Read about Kudumbashree collective farming and related programme information.", textMl: "കുടുംബശ്രീ കൂട്ടുകൃഷിയും അനുബന്ധ പരിപാടികളും അറിയുക.", url: "https://www.kudumbashree.org/pages/511", category: "Agriculture" },
];

const blankForm = { title: "", category: "Food & products", description: "", contactName: "", contactPhone: "", location: "" };
const unwrapArray = (data, key) => Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : [];

export default function CommunityHub() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const ml = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
  const secretary = ["secretary", "nhg_secretary"].includes((user?.role || "").toLowerCase());
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState({ thrift: 0, deposits: 0, members: 0, meetings: [], loans: [] });
  const [programmes, setProgrammes] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.get("/thrift"), api.get("/members"), api.get("/meetings"), api.get("/loans"), api.get("/programmes"), api.get("/enterprises"),
    ]);
    const [thrift, members, meetings, loans, programmesResult, enterpriseResult] = results;
    setSummary({
      thrift: thrift.status === "fulfilled" ? Number(thrift.value.data?.totalSavingsFund || 0) : 0,
      deposits: thrift.status === "fulfilled" ? Number(thrift.value.data?.totalDepositsCount || 0) : 0,
      members: members.status === "fulfilled" ? Number(members.value.data?.total ?? unwrapArray(members.value.data, "members").length) : 0,
      meetings: meetings.status === "fulfilled" ? unwrapArray(meetings.value.data, "meetings") : [],
      loans: loans.status === "fulfilled" ? unwrapArray(loans.value.data, "loans") : [],
    });
    setProgrammes(programmesResult.status === "fulfilled" ? unwrapArray(programmesResult.value.data, "programmes") : []);
    setListings(enterpriseResult.status === "fulfilled" ? unwrapArray(enterpriseResult.value.data, "listings") : []);
    if (enterpriseResult.status === "rejected") setError(ml ? "സംരംഭ പട്ടിക ലോഡ് ചെയ്യാനായില്ല." : "Could not load enterprise listings. Check that the backend is running, then refresh.");
    setLoading(false);
  }, [ml]);

  useEffect(() => { loadPage(); }, [loadPage]);

  const completedMinutes = useMemo(() => summary.meetings.filter((meeting) => meeting.status === "Completed" && String(meeting.minutes || "").trim()).length, [summary.meetings]);
  const training = useMemo(() => programmes.filter((item) => /training|skill|financial literacy/i.test(`${item.category} ${item.title}`)), [programmes]);
  const readiness = [
    { label: ml ? "അംഗങ്ങളുടെ പട്ടിക" : "Member register", done: summary.members > 0, detail: `${summary.members} ${ml ? "അംഗങ്ങൾ" : "members"}` },
    { label: ml ? "തുക സമ്പാദ്യ രജിസ്റ്റർ" : "Thrift register", done: summary.deposits > 0, detail: `₹${summary.thrift.toLocaleString()} • ${summary.deposits} ${ml ? "നിക്ഷേപങ്ങൾ" : "deposits"}` },
    { label: ml ? "യോഗ മിനിറ്റ്സ്" : "Meeting minutes", done: completedMinutes > 0, detail: `${completedMinutes} ${ml ? "മിനിറ്റ്സ് രേഖപ്പെടുത്തി" : "completed meetings with minutes"}` },
    { label: ml ? "വായ്പ രേഖകൾ" : "Loan register", done: summary.loans.length > 0, detail: `${summary.loans.length} ${ml ? "വായ്പ രേഖകൾ" : "loan records"}` },
  ];

  const submitListing = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/enterprises/${editing}`, form);
      else await api.post("/enterprises", form);
      setForm(blankForm); setEditing(""); setShowForm(false); await loadPage();
    } catch (err) { setError(err.response?.data?.message || (ml ? "സംരംഭം സംരക്ഷിക്കാനായില്ല." : "Could not save the listing.")); }
  };

  const editListing = (item) => {
    setForm({ title: item.title, category: item.category, description: item.description, contactName: item.contactName || "", contactPhone: item.contactPhone || "", location: item.location || "" });
    setEditing(item._id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeListing = async (id) => {
    if (!window.confirm(ml ? "ഈ പട്ടിക നീക്കം ചെയ്യണോ?" : "Remove this enterprise listing?")) return;
    try { await api.delete(`/enterprises/${id}`); await loadPage(); }
    catch (err) { setError(err.response?.data?.message || "Could not remove listing."); }
  };

  const labels = ml
    ? { title: "കുടുംബശ്രീ കമ്മ്യൂണിറ്റി ഹബ്", subtitle: "സാമ്പത്തിക രേഖകൾ, പദ്ധതികൾ, പരിശീലനം, പ്രാദേശിക സംരംഭങ്ങൾ — ഒരിടത്ത്.", overview: "എൻ.എച്ച്.ജി. സംഗ്രഹം", schemes: "പദ്ധതികളും പിന്തുണയും", enterprise: "പ്രാദേശിക സംരംഭങ്ങൾ", training: "പരിശീലന അവസരങ്ങൾ", add: "സംരംഭം ചേർക്കുക", save: "സംരക്ഷിക്കുക", cancel: "റദ്ദാക്കുക", readiness: "ബാങ്ക് ലിങ്കേജ് രേഖാ തയ്യാറെടുപ്പ്", disclaimer: "ഇത് രേഖകൾ പൂർത്തിയാക്കാനുള്ള ചെക്ക്ലിസ്റ്റ് മാത്രമാണ്; ബാങ്ക് വായ്പാ യോഗ്യതയോ അനുമതിയോ അല്ല.", minutes: "യോഗ മിനിറ്റ്സ്", memberCount: "അംഗങ്ങൾ", thrift: "ആകെ സമ്പാദ്യം", deposits: "നിക്ഷേപങ്ങൾ", official: "ഔദ്യോഗിക വിവരം കാണുക", noListings: "സംരംഭ പട്ടികകളൊന്നുമില്ല. നിങ്ങളുടെ ഗ്രൂപ്പിന്റെ സംരംഭം ആദ്യം ചേർക്കുക." }
    : { title: "Kudumbashree Community Hub", subtitle: "NHG finance records, official programme links, training and local enterprises in one place.", overview: "NHG overview", schemes: "Schemes & support", enterprise: "Local enterprises", training: "Training opportunities", add: "Add enterprise", save: "Save listing", cancel: "Cancel", readiness: "Bank linkage record readiness", disclaimer: "This is a record-completeness checklist only. It does not determine bank-loan eligibility, approval, or sanction.", minutes: "Meeting minutes", memberCount: "Members", thrift: "Total thrift", deposits: "Deposits", official: "View official information", noListings: "No enterprise listings yet. Add the first local group business." };

  const mayAdd = ["member", "secretary", "nhg_secretary"].includes((user?.role || "").toLowerCase());
  const isOwner = (item) => item.owner?._id === user?._id || item.owner === user?._id;

  return <div className="portal-page-container"><div className="container">
    <section className="portal-hero-banner mb-4">
      <span className="portal-hero-tag">{ml ? "കുടുംബശ്രീ കമ്മ്യൂണിറ്റി" : "KUDUMBASHREE COMMUNITY"}</span>
      <h1 className="portal-hero-title">{labels.title}</h1>
      <p className="portal-hero-subtitle mb-0">{labels.subtitle}</p>
    </section>

    {error && <div className="alert alert-warning d-flex justify-content-between align-items-center">{error}<button className="btn-close" aria-label="Close" onClick={() => setError("")} /></div>}

    <div className="d-flex gap-2 flex-wrap mb-4" role="tablist">
      {[["overview", `📊 ${labels.overview}`], ["schemes", `📚 ${labels.schemes}`], ["enterprise", `🧺 ${labels.enterprise}`], ["training", `🎓 ${labels.training}`]].map(([key, title]) => <button key={key} className={`btn ${tab === key ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setTab(key)} role="tab" aria-selected={tab === key}>{title}</button>)}
    </div>

    {loading ? <div className="portal-card text-center py-5">{ml ? "ലോഡ് ചെയ്യുന്നു…" : "Loading community information…"}</div> : <>
      {tab === "overview" && <>
        <div className="row g-3 mb-4">
          {[[`👥 ${labels.memberCount}`, summary.members], [`💰 ${labels.thrift}`, `₹${summary.thrift.toLocaleString()}`], [`🧾 ${labels.deposits}`, summary.deposits], [`📅 ${labels.minutes}`, completedMinutes]].map(([label, value]) => <div className="col-6 col-lg-3" key={label}><div className="portal-kpi-card h-100 flex-column align-items-start"><span className="portal-kpi-lbl">{label}</span><strong className="portal-kpi-val">{value}</strong></div></div>)}
        </div>
        <section className="portal-card mb-4">
          <div className="portal-card-header"><div><h2 className="portal-card-title">{labels.readiness}</h2><p className="text-muted mb-0 small">{labels.disclaimer}</p></div><span className="badge bg-light text-dark border">{readiness.filter((item) => item.done).length}/{readiness.length}</span></div>
          <div className="row g-3">{readiness.map((item) => <div className="col-md-6" key={item.label}><div className="d-flex gap-3 align-items-start p-3 rounded border h-100"><span className={`badge ${item.done ? "bg-success" : "bg-secondary"}`}>{item.done ? "✓" : "•"}</span><div><strong>{item.label}</strong><div className="small text-muted">{item.detail}</div></div></div></div>)}</div>
          <div className="d-flex flex-wrap gap-2 mt-3"><Link className="btn btn-outline-primary" to="/meetings">{ml ? "യോഗ രേഖകൾ തുറക്കുക" : "Open meeting records"}</Link><Link className="btn btn-outline-primary" to="/thrift">{ml ? "സമ്പാദ്യ രജിസ്റ്റർ തുറക്കുക" : "Open thrift register"}</Link><Link className="btn btn-outline-primary" to="/loans">{ml ? "വായ്പ രജിസ്റ്റർ തുറക്കുക" : "Open loan register"}</Link></div>
        </section>
        <div className="row g-3"><div className="col-md-6"><Link className="portal-card d-block h-100 text-decoration-none" to="/audit"><h3 className="portal-card-title">🛡️ {ml ? "ഓഡിറ്റ് & നിരീക്ഷണം" : "Audit & monitoring"}</h3><p className="text-muted mb-0">{ml ? "സാമ്പത്തിക ഓഡിറ്റ് രേഖകളും റിപ്പോർട്ടുകളും പരിശോധിക്കുക." : "Review finance audit records and reports."}</p></Link></div><div className="col-md-6"><Link className="portal-card d-block h-100 text-decoration-none" to="/programmes"><h3 className="portal-card-title">📅 {ml ? "പ്രോഗ്രാം കലണ്ടർ" : "Programme calendar"}</h3><p className="text-muted mb-0">{ml ? "യോഗങ്ങൾ, പരിശീലനം, കമ്മ്യൂണിറ്റി പ്രോഗ്രാമുകൾ കാണുക." : "See meetings, training sessions and community programmes."}</p></Link></div></div>
      </>}

      {tab === "schemes" && <section className="portal-card"><div className="portal-card-header"><h2 className="portal-card-title">{labels.schemes}</h2><a href="https://www.kudumbashree.org/" target="_blank" rel="noreferrer">{ml ? "കുടുംബശ്രീ ഔദ്യോഗിക സൈറ്റ്" : "Kudumbashree official website"} ↗</a></div><div className="row g-3">{schemes.map((item) => <div className="col-md-6 col-xl-4" key={item.title}><article className="border rounded-4 p-4 h-100"><div className="fs-2 mb-2">{item.icon}</div><span className="badge bg-light text-primary border mb-2">{item.category}</span><h3 className="h5 fw-bold">{ml ? item.ml : item.title}</h3><p className="text-muted">{ml ? item.textMl : item.text}</p><a href={item.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">{labels.official} ↗</a></article></div>)}</div><p className="small text-muted mt-3 mb-0">{ml ? "പദ്ധതി നിബന്ധനകൾ മാറാം. അപേക്ഷിക്കുന്നതിന് മുമ്പ് ഏറ്റവും പുതിയ ഔദ്യോഗിക മാർഗ്ഗനിർദ്ദേശം പരിശോധിക്കുക." : "Programme rules can change. Check the latest official guidelines before applying."}</p></section>}

      {tab === "enterprise" && <section className="portal-card"><div className="portal-card-header"><div><h2 className="portal-card-title">{labels.enterprise}</h2><p className="text-muted mb-0">{ml ? "നിങ്ങളുടെ എൻ.എച്ച്.ജി.യിലെ സജീവ പട്ടികകൾ മാത്രം." : "Active listings from your NHG."}</p></div>{mayAdd && <button className="btn btn-primary" onClick={() => { setForm(blankForm); setEditing(""); setShowForm(!showForm); }}>{showForm ? labels.cancel : `＋ ${labels.add}`}</button>}</div>
        {showForm && mayAdd && <form className="border rounded-4 p-3 mb-4" onSubmit={submitListing}><div className="row g-3">{[["title", ml ? "സംരംഭത്തിന്റെ പേര്" : "Business name", true], ["category", ml ? "വിഭാഗം" : "Category", true], ["location", ml ? "സ്ഥലം" : "Location", false], ["contactName", ml ? "ബന്ധപ്പെടേണ്ട വ്യക്തി" : "Contact person", false], ["contactPhone", ml ? "ഫോൺ" : "Phone", false]].map(([key, label, required]) => <div className="col-md-6" key={key}><label className="form-label" htmlFor={`enterprise-${key}`}>{label}</label><input id={`enterprise-${key}`} className="form-control" value={form[key]} required={required} maxLength={key === "description" ? 700 : 120} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></div>)}<div className="col-12"><label className="form-label" htmlFor="enterprise-description">{ml ? "വിവരണം" : "Description"}</label><textarea id="enterprise-description" className="form-control" rows="3" maxLength={700} required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="col-12 d-flex gap-2"><button className="btn btn-success" type="submit">{labels.save}</button><button className="btn btn-outline-secondary" type="button" onClick={() => { setShowForm(false); setEditing(""); }}> {labels.cancel}</button></div></div></form>}
        {!listings.length ? <div className="text-center py-5 text-muted">{labels.noListings}</div> : <div className="row g-3">{listings.map((item) => <div className="col-md-6 col-xl-4" key={item._id}><article className="border rounded-4 p-4 h-100 d-flex flex-column"><span className="badge bg-primary-subtle text-primary border align-self-start mb-2">{item.category}</span><h3 className="h5 fw-bold">{item.title}</h3><p className="text-muted">{item.description}</p><div className="small text-muted mt-auto">{item.location && <div>📍 {item.location}</div>}{item.contactName && <div>👤 {item.contactName}</div>}{item.contactPhone && <div>☎ <a href={`tel:${item.contactPhone}`}>{item.contactPhone}</a></div>}<div>{item.nhgName}</div></div>{(isOwner(item) || secretary) && <div className="d-flex gap-2 border-top pt-3 mt-3"><button className="btn btn-sm btn-outline-primary" onClick={() => editListing(item)}>{ml ? "തിരുത്തുക" : "Edit"}</button><button className="btn btn-sm btn-outline-danger" onClick={() => removeListing(item._id)}>{ml ? "നീക്കം ചെയ്യുക" : "Remove"}</button></div>}</article></div>)}</div>}
      </section>}

      {tab === "training" && <section className="portal-card"><div className="portal-card-header"><div><h2 className="portal-card-title">{labels.training}</h2><p className="text-muted mb-0">{ml ? "പ്രോഗ്രാം മാനേജ്മെന്റിൽ നിന്ന് പരിശീലന പരിപാടികൾ സ്വയം കാണിക്കുന്നു." : "Training programmes scheduled in Programme Management appear here."}</p></div>{secretary && <Link className="btn btn-primary" to="/programmes">{ml ? "പരിശീലനം ഷെഡ്യൂൾ ചെയ്യുക" : "Schedule training"}</Link>}</div>{training.length === 0 ? <div className="text-center py-5 text-muted">{ml ? "പരിശീലന പരിപാടികൾ ഇതുവരെ ഷെഡ്യൂൾ ചെയ്തിട്ടില്ല." : "No training opportunities have been scheduled yet."}<div className="mt-3"><Link to="/programmes" className="btn btn-outline-primary">{ml ? "പ്രോഗ്രാമുകൾ കാണുക" : "Browse community programmes"}</Link></div></div> : <div className="row g-3">{training.map((item) => <div className="col-md-6 col-xl-4" key={item._id}><article className="border rounded-4 p-4 h-100"><span className="badge bg-info-subtle text-dark border mb-2">{item.category}</span><h3 className="h5 fw-bold">{item.title}</h3><p className="text-muted">{item.description || (ml ? "കൂടുതൽ വിവരങ്ങൾക്ക് സെക്രട്ടറിയെ ബന്ധപ്പെടുക." : "Contact the secretary for details.")}</p><div className="small text-muted">📅 {item.date} • {item.time}<br />📍 {item.venue}</div></article></div>)}</div>}</section>}
    </>}
  </div></div>;
}
