export const speakMemberWelcome = (name, language, onStatus = () => {}) => {
  if (!("speechSynthesis" in window) || !name) {
    onStatus("unavailable");
    return false;
  }

  const speech = window.speechSynthesis;
  speech.cancel();
  const isMalayalam = String(language || "").toLowerCase().startsWith("ml");
  const voices = speech.getVoices();
  const malayalamVoice = isMalayalam && voices.find((item) => item.lang.toLowerCase().startsWith("ml"));
  const englishVoice = voices.find((item) => item.lang.toLowerCase().startsWith("en-in")) ||
    voices.find((item) => item.lang.toLowerCase().startsWith("en"));
  const voice = malayalamVoice || englishVoice;
  const greeting = isMalayalam
    ? (malayalamVoice ? `സ്വാഗതം, ${name}` : `Swagatham, ${name}`)
    : `Welcome, ${name}`;
  const utterance = new window.SpeechSynthesisUtterance(
    greeting
  );
  // Keep the requested locale even when the OS has no matching installed voice;
  // some browser speech engines can still resolve it themselves.
  utterance.lang = malayalamVoice ? "ml-IN" : (voice?.lang || "en-IN");
  if (voice) utterance.voice = voice;
  utterance.onstart = () => onStatus("playing");
  utterance.onend = () => onStatus("played");
  utterance.onerror = (event) => onStatus(event.error === "not-allowed" ? "tap" : "unavailable");

  try {
    speech.speak(utterance);
    onStatus("starting");
    return true;
  } catch {
    onStatus("tap");
    return false;
  }
};
