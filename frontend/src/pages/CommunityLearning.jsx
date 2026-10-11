import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const initialForm = { title: "", description: "", category: "NHG meetings", language: "Malayalam", videoUrl: "" };

const CommunityLearning = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isMalayalam = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
  const isAdmin = ["main_admin", "main-admin", "mainadmin", "super_admin", "superadmin"].includes((user?.role || "").toLowerCase());
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/learning-videos");
      const items = data.videos || [];
      setVideos(items);
      setSelectedId((current) => items.some((item) => item._id === current) ? current : items[0]?._id || "");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isMalayalam ? "വീഡിയോകൾ ലോഡ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക." : "Could not load learning videos. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [isMalayalam]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const selectedVideo = videos.find((video) => video._id === selectedId) || videos[0];

  const publishVideo = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/learning-videos", form);
      setVideos((items) => [data.video, ...items]);
      setSelectedId(data.video._id);
      setForm(initialForm);
      setNotice(isMalayalam ? "വീഡിയോ അംഗങ്ങൾക്കായി പ്രസിദ്ധീകരിച്ചു." : "Video published for NHG participants.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isMalayalam ? "വീഡിയോ പ്രസിദ്ധീകരിക്കാനായില്ല." : "Could not publish this video."));
    } finally {
      setSaving(false);
    }
  };

  const removeVideo = async (video) => {
    if (!window.confirm(isMalayalam ? "ഈ വീഡിയോ നീക്കം ചെയ്യണോ?" : `Remove “${video.title}” from the learning library?`)) return;
    try {
      await api.delete(`/learning-videos/${video._id}`);
      setVideos((items) => items.filter((item) => item._id !== video._id));
      setSelectedId((current) => current === video._id ? "" : current);
      setNotice(isMalayalam ? "വീഡിയോ നീക്കം ചെയ്തു." : "Video removed from the learning library.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isMalayalam ? "ഈ വീഡിയോ നീക്കം ചെയ്യാനായില്ല." : "Could not remove this video."));
    }
  };

  const text = {
    eyebrow: isMalayalam ? "കുടുംബശ്രീ പഠനവിഭവങ്ങൾ" : "KUDUMBASHREE LEARNING RESOURCES",
    heading: isMalayalam ? "സമൂഹ പരിശീലനം" : "Community Learning",
    intro: isMalayalam
      ? "എൻ.എച്ച്.ജി യോഗങ്ങൾ, സംഘടനാ പ്രവർത്തനം, ഉപജീവന മാർഗങ്ങൾ എന്നിവയെക്കുറിച്ചുള്ള സഹായകരമായ വീഡിയോകൾ ഒരിടത്ത് കാണുക."
      : "Watch useful videos about NHG meetings, community activities, and livelihoods in one place.",
  };

  return (
    <div className="container py-4 py-lg-5 community-learning-page" style={{ maxWidth: 1180 }}>
      <section className="community-learning-hero p-4 p-lg-5 rounded-4 text-white shadow-sm mb-4">
        <div className="small fw-bold text-uppercase mb-2" style={{ letterSpacing: ".12em", opacity: .8 }}>{text.eyebrow}</div>
        <h1 className="display-6 fw-bold mb-2">{text.heading}</h1>
        <p className="mb-0" style={{ maxWidth: 760 }}>{text.intro}</p>
      </section>

      {isAdmin && (
        <section className="card border-0 shadow-sm rounded-4 mb-4" aria-labelledby="publish-video-heading">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h2 id="publish-video-heading" className="h4 fw-bold mb-1">{isMalayalam ? "പഠന വീഡിയോ പ്രസിദ്ധീകരിക്കുക" : "Share a learning video"}</h2>
                <p className="text-secondary mb-0">{isMalayalam ? "പ്രസിദ്ധീകരിച്ചാൽ എല്ലാ എൻ.എച്ച്.ജി അംഗങ്ങൾക്കും സെക്രട്ടറിമാർക്കും കാണാം." : "Published videos are available to NHG members and secretaries across the portal."}</p>
              </div>
              <span className="badge rounded-pill text-bg-success">{isMalayalam ? "അഡ്മിൻ" : "Admin publishing"}</span>
            </div>
            <form onSubmit={publishVideo} className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="learning-video-title">{isMalayalam ? "വീഡിയോയുടെ പേര്" : "Video title"}</label>
                <input id="learning-video-title" className="form-control" maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={isMalayalam ? "ഉദാ: എൻ.എച്ച്.ജി യോഗം എങ്ങനെ നടത്താം" : "e.g. How to conduct an NHG meeting"} required />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="learning-video-url">{isMalayalam ? "യൂട്യൂബ് വീഡിയോ ലിങ്ക്" : "YouTube video link"}</label>
                <input id="learning-video-url" type="url" className="form-control" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" required />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="learning-video-category">{isMalayalam ? "വിഷയം" : "Topic"}</label>
                <select id="learning-video-category" className="form-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="NHG meetings">{isMalayalam ? "അയൽക്കൂട്ട യോഗങ്ങൾ" : "NHG meetings"}</option><option value="Organisation">{isMalayalam ? "സംഘടന" : "Organisation"}</option><option value="Livelihoods">{isMalayalam ? "ഉപജീവന മാർഗങ്ങൾ" : "Livelihoods"}</option><option value="Financial literacy">{isMalayalam ? "സാമ്പത്തിക സാക്ഷരത" : "Financial literacy"}</option><option value="Health and wellbeing">{isMalayalam ? "ആരോഗ്യവും ക്ഷേമവും" : "Health and wellbeing"}</option><option value="General">{isMalayalam ? "പൊതുവായവ" : "General"}</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold" htmlFor="learning-video-language">{isMalayalam ? "ഭാഷ" : "Language"}</label>
                <select id="learning-video-language" className="form-select" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
                  <option value="Malayalam">{isMalayalam ? "മലയാളം" : "Malayalam"}</option><option value="English">{isMalayalam ? "ഇംഗ്ലീഷ്" : "English"}</option><option value="Other">{isMalayalam ? "മറ്റുള്ളവ" : "Other"}</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label fw-semibold" htmlFor="learning-video-description">{isMalayalam ? "ചെറിയ വിവരണം" : "Short description"}</label>
                <input id="learning-video-description" className="form-control" maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={isMalayalam ? "ഈ വീഡിയോയിൽ എന്താണ് പഠിപ്പിക്കുന്നത്?" : "What will participants learn?"} />
              </div>
              <div className="col-12 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <small className="text-secondary">{isMalayalam ? "വീഡിയോ ഉടമ പുറം വെബ്സൈറ്റുകളിൽ പ്ലേ ചെയ്യാൻ അനുവദിച്ചിരിക്കണം." : "Choose a video whose owner allows playback on other websites."}</small>
                <button className="btn btn-primary rounded-pill px-4" type="submit" disabled={saving}>{saving ? (isMalayalam ? "പ്രസിദ്ധീകരിക്കുന്നു…" : "Publishing…") : (isMalayalam ? "വീഡിയോ പ്രസിദ്ധീകരിക്കുക" : "Publish video")}</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {(error || notice) && <div className={`alert ${error ? "alert-danger" : "alert-success"} rounded-3`} role="status">{error || notice}</div>}

      <div className="row g-4 align-items-start">
        <div className="col-12">
          {selectedVideo ? (
            <article className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="ratio ratio-16x9 bg-dark">
                <iframe
                  key={selectedVideo._id}
                  src={selectedVideo.embedUrl}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                  <div>
                    <span className="badge rounded-pill text-bg-primary mb-2">{selectedVideo.language} · {selectedVideo.category}</span>
                    <h2 className="h4 fw-bold mb-2">{selectedVideo.title}</h2>
                    {selectedVideo.description && <p className="text-secondary mb-0">{selectedVideo.description}</p>}
                  </div>
                  <a className="btn btn-primary rounded-pill px-3" href={selectedVideo.videoUrl} target="_blank" rel="noreferrer">{isMalayalam ? "യൂട്യൂബിൽ തുറക്കുക ↗" : "Open on YouTube ↗"}</a>
                </div>
              </div>
            </article>
          ) : (
            <section className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-5 text-center">
                <div className="display-4 mb-3" aria-hidden="true">▶</div>
                <h2 className="h4 fw-bold">{loading ? (isMalayalam ? "വീഡിയോകൾ ലോഡ് ചെയ്യുന്നു…" : "Loading learning videos…") : (isMalayalam ? "ഇതുവരെ വീഡിയോകൾ ചേർത്തിട്ടില്ല" : "No learning videos have been shared yet")}</h2>
                <p className="text-secondary mb-0">{loading ? (isMalayalam ? "ദയവായി കാത്തിരിക്കുക." : "Please wait a moment.") : (isMalayalam ? "അഡ്മിൻ പരിശീലന വീഡിയോ പ്രസിദ്ധീകരിച്ചാൽ അത് ഇവിടെ കാണാം." : "When the Main Admin publishes a training video, it will appear here for your NHG.")}</p>
                {!loading && <button type="button" className="btn btn-outline-primary rounded-pill mt-3" onClick={loadVideos}>{isMalayalam ? "വീണ്ടും ശ്രമിക്കുക" : "Refresh videos"}</button>}
              </div>
            </section>
          )}

          {videos.length > 1 && (
            <section className="mt-4" aria-labelledby="more-learning-videos">
              <h2 id="more-learning-videos" className="h5 fw-bold mb-3">{isMalayalam ? "കൂടുതൽ പഠന വീഡിയോകൾ" : "More learning videos"}</h2>
              <div className="row g-3">
                {videos.filter((video) => video._id !== selectedVideo?._id).map((video) => (
                  <div className="col-md-6" key={video._id}>
                    <article className="card h-100 border rounded-4">
                      <div className="card-body d-flex flex-column">
                        <span className="badge rounded-pill text-bg-light align-self-start mb-2">{video.language} · {video.category}</span>
                        <h3 className="h6 fw-bold">{video.title}</h3>
                        {video.description && <p className="small text-secondary flex-grow-1">{video.description}</p>}
                        <div className="d-flex align-items-center justify-content-between gap-2 mt-auto">
                          <button type="button" className="btn btn-outline-primary btn-sm rounded-pill" onClick={() => { setSelectedId(video._id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{isMalayalam ? "വീഡിയോ കാണുക" : "Watch video"}</button>
                          {isAdmin && <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => removeVideo(video)}>{isMalayalam ? "നീക്കം ചെയ്യുക" : "Remove"}</button>}
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityLearning;
