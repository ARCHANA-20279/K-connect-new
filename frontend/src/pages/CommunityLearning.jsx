import { useTranslation } from "react-i18next";

const videoUrl = "https://www.youtube.com/watch?v=1Mds9J2bDfs";

const CommunityLearning = () => {
  const { i18n } = useTranslation();
  const isMalayalam = i18n.resolvedLanguage === "ml" || i18n.language === "ml";
  const topics = isMalayalam
    ? [
        { icon: "🏘️", title: "കുടുംബശ്രീ സംഘടനാ ഘടന", detail: "സംഘടനയുടെ വിവിധ തലങ്ങളും അവയുടെ ബന്ധവും മനസ്സിലാക്കുക." },
        { icon: "🤝", title: "എൻ.എച്ച്.ജി ഘടനയും യോഗങ്ങളും", detail: "അയൽക്കൂട്ടത്തിന്റെ ഘടനയും യോഗങ്ങൾ നടത്തുന്നതിലെ പ്രധാന കാര്യങ്ങളും പഠിക്കുക." },
        { icon: "🌱", title: "എ.ഡി.എസ് / സി.ഡി.എസ് പ്രവർത്തനം", detail: "ഏരിയ, കമ്മ്യൂണിറ്റി വികസന സമിതികളുടെ പ്രവർത്തനങ്ങളെക്കുറിച്ച് അറിയുക." },
      ]
    : [
        { icon: "🏘️", title: "Kudumbashree organisational setup", detail: "Learn how the different levels of the organisation connect." },
        { icon: "🤝", title: "NHG structure and meetings", detail: "Explore the neighbourhood group structure and meeting practices." },
        { icon: "🌱", title: "ADS and CDS functions", detail: "Learn about the Area Development Society and Community Development Society." },
      ];

  return (
    <div className="container py-4 py-lg-5 community-learning-page" style={{ maxWidth: 1180 }}>
      <section className="community-learning-hero p-4 p-lg-5 rounded-4 text-white shadow-sm mb-4">
        <div className="small fw-bold text-uppercase mb-2" style={{ letterSpacing: ".12em", opacity: .8 }}>
          {isMalayalam ? "കുടുംബശ്രീ പഠനവിഭവങ്ങൾ" : "KUDUMBASHREE LEARNING RESOURCES"}
        </div>
        <h1 className="display-6 fw-bold mb-2">{isMalayalam ? "സമൂഹ പരിശീലനം" : "Community Learning"}</h1>
        <p className="mb-0" style={{ maxWidth: 760 }}>
          {isMalayalam
            ? "സംഘടനാ ഘടന, അയൽക്കൂട്ട യോഗങ്ങൾ, എ.ഡി.എസ് / സി.ഡി.എസ് പ്രവർത്തനങ്ങൾ എന്നിവയെക്കുറിച്ചുള്ള മലയാളം പരിശീലന വീഡിയോകൾ ഒരിടത്ത് കാണുക."
            : "Watch Malayalam training videos about the organisational structure, NHG meetings, and ADS/CDS functions in one place."}
        </p>
      </section>

      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <article className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="ratio ratio-16x9 bg-dark">
              <iframe
                src="https://www.youtube-nocookie.com/embed/1Mds9J2bDfs"
                title={isMalayalam ? "കുടുംബശ്രീ മലയാളം പരിശീലന വീഡിയോ" : "Kudumbashree Malayalam training video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <span className="badge rounded-pill text-bg-primary mb-2">{isMalayalam ? "മലയാളം" : "Malayalam"}</span>
                  <h2 className="h5 fw-bold mb-2">{isMalayalam ? "കുടുംബശ്രീ പരിശീലന വീഡിയോ" : "Kudumbashree training video"}</h2>
                  <p className="text-secondary mb-0">
                    {isMalayalam ? "സമൂഹ പരിശീലനത്തിനായി പങ്കുവെച്ച വീഡിയോ." : "Video shared for community learning."}
                  </p>
                </div>
                <a className="btn btn-primary rounded-pill px-3" href={videoUrl} target="_blank" rel="noreferrer">
                  {isMalayalam ? "യൂട്യൂബിൽ തുറക്കുക ↗" : "Open on YouTube ↗"}
                </a>
              </div>
            </div>
          </article>
        </div>

        <aside className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">{isMalayalam ? "പഠന വിഷയങ്ങൾ" : "Learning topics"}</h2>
              <div className="d-flex flex-column gap-3">
                {topics.map((topic) => (
                  <div key={topic.title} className="d-flex gap-3 align-items-start">
                    <span className="fs-4" aria-hidden="true">{topic.icon}</span>
                    <div>
                      <h3 className="h6 fw-bold mb-1">{topic.title}</h3>
                      <p className="small text-secondary mb-0">{topic.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="alert alert-light border mt-4 mb-0 small">
                {isMalayalam
                  ? "കൂടുതൽ പരിശീലന വീഡിയോകൾ ലഭിക്കുമ്പോൾ ഈ ശേഖരത്തിൽ ചേർക്കാം."
                  : "More training videos can be added to this collection as they become available."}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CommunityLearning;
