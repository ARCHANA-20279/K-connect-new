import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";

const getServiceItems = (ml) => [
  {
    title: ml ? "അയൽക്കൂട്ടം രജിസ്ട്രേഷൻ" : "NHG Registration",
    description: ml ? "ഒരു അയൽക്കൂട്ടം ആരംഭിച്ച് നിങ്ങളുടെ സമൂഹത്തെ ഓൺലൈനിലേക്ക് കൊണ്ടുവരൂ." : "Start a neighbourhood group and bring your community online.",
    label: ml ? "അയൽക്കൂട്ടം സൃഷ്ടിക്കുക" : "Create an NHG",
    href: "/register-nhg",
    symbol: "NHG",
    tone: "green",
  },
  {
    title: ml ? "അംഗ സേവനങ്ങൾ" : "Member Services",
    description: ml ? "നിങ്ങളുടെ പാസ്ബുക്ക്, യോഗങ്ങൾ, ഹാജർ, വായ്പാ വിവരങ്ങൾ എന്നിവ കാണുക." : "Access your passbook, meetings, attendance, and loan updates.",
    label: ml ? "അംഗ ലോഗിൻ" : "Member sign in",
    href: "/member-login",
    symbol: "MEM",
    tone: "gold",
  },
  {
    title: ml ? "പഠനവും നൈപുണ്യങ്ങളും" : "Learning & Skills",
    description: ml ? "സമൂഹ പഠനത്തിനും നൈപുണ്യ വികസനത്തിനുമുള്ള വിഭവങ്ങൾ കണ്ടെത്തൂ." : "Explore community learning and skill-building resources.",
    label: ml ? "പഠന വിഭവങ്ങൾ കാണുക" : "Explore learning",
    href: "/learning",
    symbol: "LEARN",
    tone: "blue",
  },
  {
    title: ml ? "കമ്മ്യൂണിറ്റി ഹബ്" : "Community Hub",
    description: ml ? "പ്രാദേശിക സംരംഭങ്ങൾ, ഉൽപ്പന്നങ്ങൾ, സമൂഹ പ്രവർത്തനങ്ങൾ എന്നിവ കണ്ടെത്തൂ." : "Discover local enterprises, products, and community work.",
    label: ml ? "ഹബ് സന്ദർശിക്കുക" : "Visit the hub",
    href: "/community-hub",
    symbol: "HUB",
    tone: "rose",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="kc-home-arrow">
      <path d="M4 10h11M10 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="kc-home-search-icon">
      <circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 15.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const HomePage = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isMl = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ml");
  const serviceItems = getServiceItems(isMl);
  const [query, setQuery] = useState("");
  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return serviceItems;
    return serviceItems.filter((service) =>
      `${service.title} ${service.description} ${service.label}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query, serviceItems]);

  return (
    <div className="kc-home-page">
      <section className="kc-home-hero">
        <div className="kc-home-container">
          <div className="kc-home-hero-grid">
            <div className="kc-home-hero-copy">
              <div className="kc-home-feature-panel">
                <div className="kc-home-eyebrow">
                  <span className="kc-home-eyebrow-mark" aria-hidden="true">K</span>
                  {isMl ? "കുടുംബശ്രീ സമൂഹ പ്ലാറ്റ്ഫോം" : "Kudumbashree community platform"}
                </div>
                <h1>
                  {isMl ? "സമൂഹം ഒന്നിക്കുന്നു" : "Where Community"}
                  <span>{isMl ? "അവസരങ്ങളിലേക്ക്" : "Meets Opportunity"}</span>
                </h1>
                <p className="kc-home-malayalam" lang="ml">എല്ലാവർക്കും അവസരം</p>
              <form className="kc-home-search" role="search" onSubmit={(event) => event.preventDefault()}>
                <SearchIcon />
                <label className="visually-hidden" htmlFor="kc-home-search-input">{isMl ? "കെ-കണക്ടിൽ തിരയുക" : "Search K-Connect"}</label>
                <input
                  id="kc-home-search-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isMl ? "അയൽക്കൂട്ടം, സേവനം, ഉൽപ്പന്നം എന്നിവ തിരയുക…" : "Search your Ayalkootam, service, or product..."}
                />
                <button type="submit" aria-label={isMl ? "കെ-കണക്ടിൽ തിരയുക" : "Search K-Connect"}><SearchIcon /></button>
              </form>
                <div className="kc-home-inline-photo">
                  <img src="/kudumbashree-hero.png" alt="Kudumbashree women working together in a neighbourhood group" />
                  <span>{isMl ? "ഓരോ അയൽക്കൂട്ടത്തിലും സ്ത്രീകൾ നയിക്കുന്ന മുന്നേറ്റം" : "Women-led progress, rooted in every neighbourhood"}</span>
                </div>
              </div>
            </div>

            <aside className="kc-home-hero-visual" aria-labelledby="kc-home-spotlights-title">
              <div className="kc-home-spotlight-heading">
                <span className="kc-home-section-kicker">{isMl ? "നമ്മുടെ സമൂഹങ്ങളുടെ കഥകൾ" : "Stories from our communities"}</span>
                <h2 id="kc-home-spotlights-title">{isMl ? "സമീപകാല സമൂഹ വിശേഷങ്ങൾ" : "Latest community spotlights"}</h2>
              </div>
              <article className="kc-home-mini-spotlight">
                <span className="kc-home-mini-art kc-home-mini-enterprise" aria-hidden="true"><img src="/kudumbashree-hero.png" alt="" /></span>
                <div><h3>{isMl ? "സൂക്ഷ്മ സംരംഭങ്ങൾ" : "Micro-enterprises"}</h3><p>{isMl ? "സ്ത്രീകൾ നയിക്കുന്ന ഉൽപ്പന്നങ്ങളും പ്രാദേശിക ഉപജീവന മാർഗങ്ങളും." : "Women-led products and local livelihoods."}</p></div>
                <ArrowIcon />
              </article>
              <article className="kc-home-mini-spotlight">
                <span className="kc-home-mini-art kc-home-mini-training" aria-hidden="true"><img src="/kudumbashree-hero.png" alt="" /></span>
                <div><h3>{isMl ? "പരിശീലനം" : "Training"}</h3><p>{isMl ? "ആത്മവിശ്വാസമുള്ള സമൂഹങ്ങൾക്കായി പ്രായോഗിക നൈപുണ്യങ്ങൾ." : "Practical skills for confident communities."}</p></div>
                <ArrowIcon />
              </article>
              <article className="kc-home-mini-spotlight">
                <span className="kc-home-mini-art kc-home-mini-stories" aria-hidden="true"><img src="/kudumbashree-hero.png" alt="" /></span>
                <div><h3>{isMl ? "വിജയകഥകൾ" : "Success stories"}</h3><p>{isMl ? "ദീർഘകാല മാറ്റം സൃഷ്ടിക്കുന്ന ചെറിയ ആശയങ്ങൾ." : "Small ideas making a lasting difference."}</p></div>
                <ArrowIcon />
              </article>
              <Link to={user ? "/community-hub" : "/register"} className="kc-home-spotlight-more">{isMl ? "നിങ്ങളുടെ സമൂഹത്തിലെ മുന്നേറ്റങ്ങൾ കാണുക" : "See what’s growing in your community"} <ArrowIcon /></Link>
            </aside>
          </div>

          <nav className="kc-home-quick-links" aria-label={isMl ? "കെ-കണക്ടിലെ പ്രധാന സേവനങ്ങൾ" : "Popular K-Connect services"}>
            <Link to={user ? "/loans" : "/member-login"}><span className="kc-home-quick-mark">₹</span><strong>{isMl ? "സൂക്ഷ്മ വായ്പാ നില" : "Microcredit status"}</strong></Link>
            <Link to={user ? "/learning" : "/register"}><span className="kc-home-quick-mark">R</span><strong>{isMl ? "വിഭവ ശേഖരം" : "Resource library"}</strong></Link>
            <Link to={user ? "/learning" : "/register"}><span className="kc-home-quick-mark">S</span><strong>{isMl ? "നൈപുണ്യ പരിശീലന കേന്ദ്രം" : "Skill training hub"}</strong></Link>
            <Link to={user ? "/community-hub" : "/register"}><span className="kc-home-quick-mark">M</span><strong>{isMl ? "വിപണി" : "Marketplace"}</strong></Link>
          </nav>

          <div className="kc-home-tier-strip" aria-label={isMl ? "കുടുംബശ്രീയുടെ മൂന്ന് തലങ്ങളിലുള്ള ഘടന" : "Kudumbashree's three-tier community structure"}>
            <div className="kc-home-tier-intro">{isMl ? "എല്ലാ തലങ്ങളിലും ബന്ധിപ്പിച്ച സമൂഹം" : "A community connected at every level"}</div>
            <div className="kc-home-tier-item"><span>01</span><strong>NHG</strong><small>{isMl ? "അയൽക്കൂട്ടം" : "Neighbourhood Group"}</small></div>
            <div className="kc-home-tier-rule" aria-hidden="true" />
            <div className="kc-home-tier-item"><span>02</span><strong>ADS</strong><small>{isMl ? "പ്രദേശ വികസന സമിതി" : "Area Development Society"}</small></div>
            <div className="kc-home-tier-rule" aria-hidden="true" />
            <div className="kc-home-tier-item"><span>03</span><strong>CDS</strong><small>{isMl ? "സമൂഹ വികസന സമിതി" : "Community Development Society"}</small></div>
          </div>
        </div>
      </section>

      <section className="kc-home-services" id="services">
        <div className="kc-home-container">
          <div className="kc-home-section-heading">
            <div>
              <span className="kc-home-section-kicker">{isMl ? "കൂട്ടായ മുന്നേറ്റത്തിനുള്ള പ്ലാറ്റ്ഫോം" : "A platform for collective progress"}</span>
              <h2>{isMl ? "കെ-കണക്ടിൽ ആവശ്യമായ സേവനം കണ്ടെത്തൂ" : "Find your way around K-Connect"}</h2>
              <p>{isMl ? "ആരംഭിക്കാൻ ഒരു സേവനം തിരഞ്ഞെടുക്കുക, അല്ലെങ്കിൽ തിരയുക." : "Choose a service to get started, or search to find what you need."}</p>
            </div>
            <Link to="/about" className="kc-home-text-link">{isMl ? "കെ-കണക്ടിനെക്കുറിച്ച് അറിയുക" : "Discover K-Connect"} <ArrowIcon /></Link>
          </div>

          <div className="kc-home-service-grid" aria-live="polite">
            {visibleServices.map((service, index) => (
              <Link className={`kc-home-service-card kc-home-tone-${service.tone}`} to={service.href} key={service.title}>
                <div className="kc-home-service-topline">
                  <span className="kc-home-service-symbol">{service.symbol}</span>
                  <span className="kc-home-service-index">0{index + 1}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="kc-home-service-link">{service.label}<ArrowIcon /></span>
              </Link>
            ))}
            {visibleServices.length === 0 && (
              <div className="kc-home-no-results">{isMl ? `“${query}” എന്ന തിരച്ചിലിന് സേവനങ്ങളില്ല. “അംഗം”, “NHG”, “പഠനം” എന്നിവ ശ്രമിക്കുക.` : `No services match “${query}”. Try “member”, “NHG”, or “learning”.`}</div>
            )}
          </div>
        </div>
      </section>

      <section className="kc-home-spotlight" id="notices">
        <div className="kc-home-container kc-home-spotlight-layout">
          <div className="kc-home-spotlight-intro">
            <span className="kc-home-section-kicker">{isMl ? "ജനങ്ങളെ കേന്ദ്രീകരിച്ച്" : "Built around people"}</span>
            <h2>{isMl ? <>ചെറിയ ചുവടുകൾ.<br />ശക്തമായ സമൂഹങ്ങൾ.</> : <>Small steps.<br />Stronger communities.</>}</h2>
            <p>{isMl ? "ദൈനംദിന കൂട്ടായ പ്രവർത്തനങ്ങൾ മുതൽ പുതിയ നൈപുണ്യങ്ങളും പ്രാദേശിക ഉപജീവന മാർഗങ്ങളും വരെ, സമൂഹ പങ്കാളിത്തം എളുപ്പമാക്കാൻ കെ-കണക്ട് സഹായിക്കുന്നു." : "From everyday group coordination to new skills and local livelihoods, K-Connect helps make community participation easier."}</p>
            <Link to={user ? "/community-hub" : "/register"} className="kc-home-text-link">
              {user ? (isMl ? "കമ്മ്യൂണിറ്റി ഹബ് കാണുക" : "Explore the community hub") : (isMl ? "സമൂഹത്തിന്റെ ഭാഗമാകൂ" : "Be part of the community")}<ArrowIcon />
            </Link>
          </div>
          <div className="kc-home-spotlight-list">
            <article className="kc-home-spotlight-card">
              <span className="kc-home-spotlight-number">01</span>
              <div><h3>{isMl ? "പ്രാദേശിക ഉപജീവനം" : "Local livelihoods"}</h3><p>{isMl ? "സ്ത്രീകൾ നയിക്കുന്ന സംരംഭങ്ങളെയും സമൂഹ പ്രവർത്തനങ്ങളെയും കൂടുതൽ ആളുകളിലെത്തിക്കൂ." : "Help women-led enterprises and community work reach more people."}</p></div>
              <span className="kc-home-spotlight-mark" aria-hidden="true">L</span>
            </article>
            <article className="kc-home-spotlight-card">
              <span className="kc-home-spotlight-number">02</span>
              <div><h3>{isMl ? "ഒരുമിച്ചുള്ള പഠനം" : "Learning together"}</h3><p>{isMl ? "എല്ലാവർക്കും ലഭ്യമായ സമൂഹ പഠനത്തിലൂടെ പ്രായോഗിക നൈപുണ്യങ്ങൾ വളർത്തൂ." : "Build practical skills through accessible community learning."}</p></div>
              <span className="kc-home-spotlight-mark" aria-hidden="true">S</span>
            </article>
            <article className="kc-home-spotlight-card">
              <span className="kc-home-spotlight-number">03</span>
              <div><h3>{isMl ? "ബന്ധിപ്പിച്ച അയൽക്കൂട്ടങ്ങൾ" : "Connected groups"}</h3><p>{isMl ? "യോഗങ്ങൾ, ഹാജർ, സമ്പാദ്യം, പുതുക്കലുകൾ എന്നിവ ഒരിടത്ത് സൂക്ഷിക്കൂ." : "Keep meetings, attendance, savings, and updates in one place."}</p></div>
              <span className="kc-home-spotlight-mark" aria-hidden="true">C</span>
            </article>
          </div>
        </div>
      </section>

      <section className="kc-home-join" id="contact">
        <div className="kc-home-container kc-home-join-inner">
          <div>
            <span className="kc-home-section-kicker">{isMl ? "നിങ്ങളുടെ സമൂഹ യാത്ര ഇവിടെ തുടങ്ങുന്നു" : "Your community starts here"}</span>
            <h2>{isMl ? "നമുക്ക് ഒരുമിച്ച് മുന്നേറാം." : "Let’s move forward, together."}</h2>
            <p>{isMl ? "തുടരാൻ ലോഗിൻ ചെയ്യുക, അംഗമായി അയൽക്കൂട്ടത്തിൽ ചേരുക, അല്ലെങ്കിൽ പുതിയ അയൽക്കൂട്ടം രജിസ്റ്റർ ചെയ്യുക." : "Sign in to continue, join an NHG as a member, or register a new neighbourhood group."}</p>
          </div>
          <div className="kc-home-join-actions">
            <Link to={user ? "/dashboard" : "/member-login"} className="kc-home-button kc-home-button-primary">
              {user ? (isMl ? "ഡാഷ്ബോർഡിലേക്ക് പോകുക" : "Go to dashboard") : (isMl ? "ലോഗിൻ" : "Sign in")}<ArrowIcon />
            </Link>
            <Link to="/register-nhg" className="kc-home-button kc-home-button-light">{isMl ? "പുതിയ അയൽക്കൂട്ടം രജിസ്റ്റർ ചെയ്യുക" : "Register a new NHG"}</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
