import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../api";
import "./KBazaar.css";

const categories = [
  { id: "all", label: "All Products" },
  { id: "food", label: "Food Items" },
  { id: "handicrafts", label: "Handicrafts" },
  { id: "agri", label: "Agri-Products" },
];
const blankProduct = { title: "", category: "food", price: "", description: "", icon: "🧺", mark: "NHG made" };
const getRole = (user) => (user?.role || "").toLowerCase().replace(/[-_]/g, "");
const sameNHG = (user, product) => {
  if (user?.nhgId && product?.nhgId) return String(user.nhgId).trim().toLowerCase() === String(product.nhgId).trim().toLowerCase();
  const memberNHG = String(user?.nhgName || "").trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const productNHG = String(product?.nhgName || "").trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return Boolean(memberNHG && productNHG && memberNHG === productNHG);
};

export default function KBazaar() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const ml = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().startsWith("ml");
  const role = getRole(user);
  const isSecretary = role === "secretary" || role === "nhgsecretary";
  const isMember = role === "member" || role === "nhgmember";
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [contactingProduct, setContactingProduct] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState(blankProduct);
  const [showChats, setShowChats] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const words = ml ? {
    eyebrow: "കുടുംബശ്രീ ഉൽപ്പന്ന വിപണി", title: "കെ-ബസാർ", intro: "കുടുംബശ്രീ അയൽക്കൂട്ടങ്ങൾ നിർമ്മിക്കുന്ന ഉൽപ്പന്നങ്ങൾ കണ്ടെത്തൂ.", search: "ഉൽപ്പന്നം, യൂണിറ്റ്, വിഭാഗം എന്നിവ തിരയുക…", noProducts: "ഇപ്പോൾ ഉൽപ്പന്നങ്ങളൊന്നും ലഭ്യമല്ല.", adminHint: "സെക്രട്ടറിക്ക് അവരുടെ അയൽക്കൂട്ടത്തിനായി ഉൽപ്പന്നങ്ങൾ പ്രസിദ്ധീകരിക്കാം.", price: "വില", contact: "സെക്രട്ടറിയോട് ചോദിക്കുക", otherNHGOnly: "മറ്റ് അയൽക്കൂട്ടങ്ങളിലെ അംഗങ്ങൾക്ക് ലഭ്യം", viewChats: isSecretary ? "വാങ്ങുന്നവരുടെ ചാറ്റുകൾ" : "എന്റെ ഉൽപ്പന്ന ചാറ്റുകൾ", addProduct: "ഉൽപ്പന്നം ചേർക്കുക", hideForm: "റദ്ദാക്കുക", titleLabel: "ഉൽപ്പന്നത്തിന്റെ പേര്", categoryLabel: "വിഭാഗം", amount: "വില (₹)", details: "വിവരണം", badge: "ബാഡ്ജ്", icon: "ഐക്കൺ", publish: "പ്രസിദ്ധീകരിക്കുക", publishing: "പ്രസിദ്ധീകരിക്കുന്നു…", noChats: "ചാറ്റുകളൊന്നുമില്ല. ഉൽപ്പന്നത്തെക്കുറിച്ച് ചോദിക്കുമ്പോൾ ചാറ്റ് ഇവിടെ കാണാം.", chatWith: "ഉൽപ്പന്നത്തെക്കുറിച്ചുള്ള ചോദ്യം", send: "അയയ്ക്കുക", sending: "അയയ്ക്കുന്നു…", replyPlaceholder: "നിങ്ങളുടെ സന്ദേശം എഴുതുക…", quickQuestions: "ചോദിക്കാൻ എളുപ്പമുള്ളത്", quickQuestionItems: ["ഇതിന്റെ വില എത്രയാണ്?", "ഇത് ലഭ്യമാണോ?", "ഓർഡർ ചെയ്യുന്നത് എങ്ങനെ?"], messageLanguageNote: "നിങ്ങൾ അയക്കുന്ന ഭാഷയിൽ തന്നെയാണ് സന്ദേശം എത്തുക.", yours: "നിങ്ങൾ", member: "അംഗം", secretary: "സെക്രട്ടറി", emptyChat: "ചോദ്യം അയച്ച് ചാറ്റ് ആരംഭിക്കൂ.", errorLoad: "ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യാനായില്ല.", categoryNames: { food: "ഭക്ഷ്യവസ്തുക്കൾ", handicrafts: "കരകൗശല വസ്തുക്കൾ", agri: "കാർഷിക ഉൽപ്പന്നങ്ങൾ", other: "മറ്റുള്ളവ" },
  } : {
    eyebrow: "MADE BY KUDUMBASHREE NHGs", title: "K-Bazaar", intro: "Discover products made by Kudumbashree neighbourhood groups.", search: "Search products, units, or categories…", noProducts: "No products are listed yet.", adminHint: "The Secretary can publish products for their NHG.", price: "Price", contact: "Ask the Secretary", otherNHGOnly: "Available to members of other NHGs", viewChats: isSecretary ? "Buyer chats" : "My product chats", addProduct: "Add product", hideForm: "Cancel", titleLabel: "Product name", categoryLabel: "Category", amount: "Price (₹)", details: "Description", badge: "Badge", icon: "Icon", publish: "Publish product", publishing: "Publishing…", noChats: "No chats yet. Member questions about your products will appear here.", chatWith: "Product question", send: "Send", sending: "Sending…", replyPlaceholder: "Write a message…", quickQuestions: "Quick questions", quickQuestionItems: ["What is the price?", "Is this available?", "How can I place an order?"], messageLanguageNote: "Your message is sent as you write it; the Secretary can reply in Malayalam or English.", yours: "You", member: "Member", secretary: "Secretary", emptyChat: "Send a message to start this conversation.", errorLoad: "Could not load products.", categoryNames: { food: "Food Items", handicrafts: "Handicrafts", agri: "Agri-Products", other: "Other" },
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/marketplace/products");
      setProducts(data.products || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || words.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [words.errorLoad]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const haystack = `${product.title} ${product.description} ${product.nhgName} ${product.category}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [products, query, category]);

  const loadConversations = useCallback(async (preferredId) => {
    try {
      const { data } = await api.get("/marketplace/conversations");
      const items = data.conversations || [];
      setConversations(items);
      const nextId = preferredId || conversation?._id || items[0]?._id;
      if (nextId) {
        const response = await api.get(`/marketplace/conversations/${nextId}`);
        setConversation(response.data.conversation);
      } else setConversation(null);
      setChatError("");
    } catch (requestError) {
      setChatError(requestError.response?.data?.message || (ml ? "ചാറ്റുകൾ ലോഡ് ചെയ്യാനായില്ല." : "Could not load product chats."));
    }
  }, [conversation?._id, ml]);

  useEffect(() => {
    if (!showChats) return undefined;
    loadConversations();
    const timer = window.setInterval(() => loadConversations(), 6000);
    return () => window.clearInterval(timer);
  }, [showChats, loadConversations]);

  const openProductChat = async (product) => {
    setContactingProduct(product._id);
    setChatError("");
    try {
      const { data } = await api.post(`/marketplace/products/${product._id}/conversations`);
      setShowChats(true);
      setConversation(data.conversation);
      await loadConversations(data.conversation._id);
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || (ml ? "സെക്രട്ടറിയുമായി ചാറ്റ് തുറക്കാനായില്ല." : "Could not open a chat with this Secretary."));
    } finally {
      setContactingProduct("");
    }
  };

  const publishProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/marketplace/products", { ...productForm, price: Number(productForm.price) });
      setProducts((items) => [data.product, ...items]);
      setProductForm(blankProduct);
      setShowProductForm(false);
      setMessage(data.message || (ml ? "ഉൽപ്പന്നം പ്രസിദ്ധീകരിച്ചു." : "Product published to K-Bazaar."));
    } catch (requestError) {
      setError(requestError.response?.data?.message || (ml ? "ഉൽപ്പന്നം പ്രസിദ്ധീകരിക്കാനായില്ല." : "Could not publish this product."));
    } finally {
      setSavingProduct(false);
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(ml ? "ഈ ഉൽപ്പന്നം നീക്കം ചെയ്യണോ?" : `Remove “${product.title}” from K-Bazaar?`)) return;
    try {
      await api.delete(`/marketplace/products/${product._id}`);
      setProducts((items) => items.filter((item) => item._id !== product._id));
      setMessage(ml ? "ഉൽപ്പന്നം നീക്കം ചെയ്തു." : "Product removed from K-Bazaar.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not remove this product.");
    }
  };

  const selectConversation = async (item) => {
    try {
      const { data } = await api.get(`/marketplace/conversations/${item._id}`);
      setConversation(data.conversation);
      setChatError("");
    } catch (requestError) {
      setChatError(requestError.response?.data?.message || "Could not open this chat.");
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!conversation || !chatMessage.trim()) return;
    setSendingMessage(true);
    setChatError("");
    try {
      await api.post(`/marketplace/conversations/${conversation._id}/messages`, { body: chatMessage.trim() });
      setChatMessage("");
      await loadConversations(conversation._id);
    } catch (requestError) {
      setChatError(requestError.response?.data?.message || (ml ? "സന്ദേശം അയക്കാനായില്ല." : "Could not send your message."));
    } finally {
      setSendingMessage(false);
    }
  };

  const searchByVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setMessage(ml ? "ഈ ബ്രൗസറിൽ ശബ്ദ തിരച്ചിൽ ലഭ്യമല്ല. ടൈപ്പ് ചെയ്ത് തിരയുക." : "Voice search is unavailable in this browser. Type your search instead."); return; }
    const recognition = new Recognition();
    recognition.lang = ml ? "ml-IN" : "en-IN";
    recognition.onresult = (event) => setQuery(event.results[0][0].transcript);
    recognition.onerror = () => setMessage(ml ? "ശബ്ദം കേൾക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക." : "Could not hear that. Please try again.");
    recognition.start();
  };

  const categoryLabel = (id) => words.categoryNames[id] || words.categoryNames.other;

  return (
    <section className="kb-market" aria-labelledby="kb-market-title">
      <div className="kb-market-heading">
        <div><span className="kb-market-eyebrow">{words.eyebrow}</span><h2 id="kb-market-title">{words.title}</h2><p>{words.intro}</p></div>
        <div className="kb-market-actions">
          {(isMember || isSecretary) && <button className="kb-secondary-button" type="button" onClick={() => { setShowChats(true); setConversation(null); }}>{words.viewChats}</button>}
          {isSecretary && <button className="kb-primary-button" type="button" onClick={() => setShowProductForm((value) => !value)}>{showProductForm ? words.hideForm : `＋ ${words.addProduct}`}</button>}
        </div>
      </div>

      {isSecretary && showProductForm && <form className="kb-publish-form" onSubmit={publishProduct}>
        <h3>{ml ? "അയൽക്കൂട്ട ഉൽപ്പന്നം പ്രസിദ്ധീകരിക്കുക" : "Publish a product for your NHG"}</h3>
        <p>{ml ? `${user?.nhgName || "നിങ്ങളുടെ അയൽക്കൂട്ടം"} അംഗങ്ങൾക്ക് കാണാം. അംഗങ്ങൾ നിങ്ങൾക്ക് നേരിട്ട് ചാറ്റ് ചെയ്യാം.` : `${user?.nhgName || "Your NHG"} products will appear in the shared marketplace. Members can chat with you directly.`}</p>
        <div className="kb-form-grid">
          <label>{words.titleLabel}<input required maxLength={120} value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} /></label>
          <label>{words.categoryLabel}<select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}><option value="food">{categoryLabel("food")}</option><option value="handicrafts">{categoryLabel("handicrafts")}</option><option value="agri">{categoryLabel("agri")}</option><option value="other">{categoryLabel("other")}</option></select></label>
          <label>{words.amount}<input type="number" min="0" max="10000000" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
          <label>{words.icon}<input maxLength={12} value={productForm.icon} onChange={(e) => setProductForm({ ...productForm, icon: e.target.value })} /></label>
          <label>{words.badge}<input maxLength={40} value={productForm.mark} onChange={(e) => setProductForm({ ...productForm, mark: e.target.value })} /></label>
          <label className="kb-form-wide">{words.details}<textarea rows="2" maxLength={1000} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
        </div>
        <button className="kb-primary-button" type="submit" disabled={savingProduct}>{savingProduct ? words.publishing : words.publish}</button>
      </form>}

      <ol className="kb-governance-tiers" aria-label={ml ? "കുടുംബശ്രീയുടെ മൂന്ന് തലങ്ങൾ" : "Kudumbashree three-tier structure"}>
        <li><strong>NHG</strong><span>Neighbourhood Group</span></li><li><strong>ADS</strong><span>Area Development Society</span></li><li><strong>CDS</strong><span>Community Development Society</span></li>
      </ol>

      <div className="kb-searchbar" role="search">
        <svg className="kb-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={words.search} aria-label={words.search} />
        <button className="kb-mic-button" type="button" onClick={searchByVoice} aria-label={ml ? "ശബ്ദ തിരച്ചിൽ" : "Search by voice"} title={ml ? "ശബ്ദ തിരച്ചിൽ" : "Search by voice"}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
      </div>

      <div className="kb-filter-row" role="group" aria-label={ml ? "വിഭാഗം അനുസരിച്ച് ഉൽപ്പന്നങ്ങൾ തിരയുക" : "Filter products by category"}>
        {categories.map((item) => {
          const label = ml ? ({ all: "എല്ലാ ഉൽപ്പന്നങ്ങളും", food: "ഭക്ഷ്യവസ്തുക്കൾ", handicrafts: "കരകൗശല വസ്തുക്കൾ", agri: "കാർഷിക ഉൽപ്പന്നങ്ങൾ" }[item.id]) : item.label;
          return <button key={item.id} className="kb-filter-pill" type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{label}</button>;
        })}
      </div>

      {(message || error) && <p className={`kb-voice-status ${error ? "kb-error" : ""}`} role="status">{error || message}</p>}

      {loading ? <p className="kb-no-results" role="status">{ml ? "ഉൽപ്പന്നങ്ങൾ ലോഡ് ചെയ്യുന്നു…" : "Loading products…"}</p> : <div className="kb-product-list" aria-live="polite">
        {filteredProducts.map((product) => <article className="kb-product-card" key={product._id}>
          <div className="kb-product-card__image" role="img" aria-label={product.title}><span className="kb-product-card__badge">{product.mark}</span><span className="kb-product-card__image-art" aria-hidden="true">{product.icon || "🧺"}</span></div>
          <div className="kb-product-card__content">
            <h3 className="kb-product-card__title">{product.title}</h3>
            <p className="kb-product-card__location">📍 {product.nhgName}</p>
            {product.description && <p className="kb-product-card__description">{product.description}</p>}
            <div className="kb-product-card__footer"><div><span className="kb-product-card__price-label">{words.price}</span><span className="kb-product-card__price">₹{Number(product.price).toLocaleString("en-IN")}</span></div>
              {isMember ? sameNHG(user, product) ? <span className="kb-same-nhg-note" title={ml ? "മറ്റ് അയൽക്കൂട്ടങ്ങളിലെ അംഗങ്ങൾക്ക് മാത്രം ബന്ധപ്പെടാം." : "Only members from other NHGs can contact this seller."}>{words.otherNHGOnly}</span> : <button className="kb-product-card__button" type="button" disabled={contactingProduct === product._id} onClick={() => openProductChat(product)}>{contactingProduct === product._id ? (ml ? "തുറക്കുന്നു…" : "Opening…") : words.contact}</button> : isSecretary && String(product.secretary?._id || product.secretary) === String(user?._id) ? <button className="kb-product-card__button kb-product-card__remove" type="button" onClick={() => removeProduct(product)}>{ml ? "എന്റെ ഉൽപ്പന്നം നീക്കം ചെയ്യുക" : "Remove my product"}</button> : null}
            </div>
          </div>
        </article>)}
        {!filteredProducts.length && <div className="kb-no-results" role="status">{loading ? (ml ? "ലോഡ് ചെയ്യുന്നു…" : "Loading…") : error ? "" : isSecretary ? words.adminHint : words.noProducts}</div>}
      </div>}
      <p className="kb-demo-caption">{ml ? "ഓർഡറും ലഭ്യതയും സംബന്ധിച്ച് ഉൽപ്പന്നം പ്രസിദ്ധീകരിച്ച സെക്രട്ടറിയുമായി ചാറ്റ് ചെയ്യുക." : "Ask the Secretary who posted the product about availability and ordering."}</p>

      {showChats && <div className="kb-chat-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowChats(false); }}>
        <section className="kb-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-chat-title">
          <header className="kb-chat-header"><div><span>{words.chatWith}</span><h2 id="kb-chat-title">{isSecretary ? (ml ? "അംഗങ്ങളുടെ ഉൽപ്പന്ന ചോദ്യങ്ങൾ" : "Member product questions") : (ml ? "സെക്രട്ടറിയുമായുള്ള ചാറ്റ്" : "Chat with your NHG Secretaries")}</h2><p>{isSecretary ? (ml ? "ഒരു അംഗത്തിന്റെ ചാറ്റ് തിരഞ്ഞെടുക്കുക; താഴെ മറുപടി എഴുതി അയയ്ക്കുക." : "Select a member conversation, then reply in the message box below.") : (ml ? "നിങ്ങളുടെ ചോദ്യം ഉൽപ്പന്നം പ്രസിദ്ധീകരിച്ച സെക്രട്ടറിക്ക് നേരിട്ട് ലഭിക്കും." : "Your question goes directly to the Secretary who listed the product.")}</p></div><button type="button" className="kb-chat-close" aria-label={ml ? "അടയ്ക്കുക" : "Close"} onClick={() => setShowChats(false)}>×</button></header>
          <div className="kb-chat-layout">
            <aside className="kb-chat-list" aria-label={ml ? "ചാറ്റുകൾ" : "Conversations"}>
              {conversations.length ? conversations.map((item) => <button className={`kb-chat-list-item ${conversation?._id === item._id ? "is-selected" : ""}`} key={item._id} onClick={() => selectConversation(item)} type="button">
                <strong>{isSecretary ? (item.member?.name || words.member) : (item.secretary?.name || words.secretary)}</strong><span>{item.product?.title || (ml ? "ഉൽപ്പന്നം" : "Product")}</span><small>{item.lastMessage?.body || words.emptyChat}</small>{item.unreadCount > 0 && <b className="kb-chat-unread">{item.unreadCount}</b>}
              </button>) : <p className="kb-chat-empty-list">{words.noChats}</p>}
            </aside>
            <div className="kb-chat-thread">
              {conversation ? <>
                <div className="kb-chat-product-summary"><span>{conversation.product?.icon || "🧺"}</span><div><strong>{conversation.product?.title}</strong><small>{conversation.nhgName} · ₹{Number(conversation.product?.price || 0).toLocaleString("en-IN")}</small></div></div>
                <div className="kb-chat-messages" aria-live="polite">
                  {conversation.messages?.length ? conversation.messages.map((item) => {
                    const own = String(item.sender?._id || item.sender) === String(user?._id);
                    return <div key={item._id} className={`kb-chat-bubble ${own ? "is-own" : ""}`}><small>{own ? words.yours : item.senderName} · {new Date(item.createdAt).toLocaleString(ml ? "ml-IN" : "en-IN", { dateStyle: "short", timeStyle: "short" })}</small><p>{item.body}</p></div>;
                  }) : <p className="kb-chat-no-messages">{words.emptyChat}</p>}
                </div>
                {!isSecretary && <div className="kb-chat-quick-questions"><span>{words.quickQuestions}</span><div>{words.quickQuestionItems.map((question) => <button type="button" key={question} onClick={() => setChatMessage(question)}>{question}</button>)}</div><small>{words.messageLanguageNote}</small></div>}
                <form className="kb-chat-compose" onSubmit={sendMessage}><textarea rows="2" maxLength={2000} value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} placeholder={words.replyPlaceholder} aria-label={words.replyPlaceholder} /><button className="kb-primary-button" disabled={sendingMessage || !chatMessage.trim()}>{sendingMessage ? words.sending : words.send}</button></form>
              </> : <div className="kb-chat-prompt">{isSecretary ? (ml ? "ചാറ്റ് തുറക്കാൻ ഒരു അംഗത്തെ തിരഞ്ഞെടുക്കുക." : "Choose a member conversation to reply.") : (ml ? "നിങ്ങൾ ബന്ധപ്പെട്ട ഒരു ഉൽപ്പന്നം തിരഞ്ഞെടുക്കൂ." : "Choose a product conversation, or start one from a product card.")}</div>}
              {chatError && <p className="kb-chat-error" role="alert">{chatError}</p>}
            </div>
          </div>
        </section>
      </div>}
    </section>
  );
}
