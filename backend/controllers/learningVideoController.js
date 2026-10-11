const LearningVideo = require("../models/LearningVideo");

const getYouTubeVideo = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else if (["embed", "shorts", "live"].includes(parts[0])) id = parts[1] || "";
  }

  return /^[A-Za-z0-9_-]{11}$/.test(id) ? {
    id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  } : null;
};

const listLearningVideos = async (_req, res) => {
  try {
    const videos = await LearningVideo.find({ published: true }).sort({ createdAt: -1 });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ message: "Unable to load learning videos." });
  }
};

const publishLearningVideo = async (req, res) => {
  const { title, description, category, language, videoUrl } = req.body || {};
  const parsed = getYouTubeVideo(videoUrl || "");
  if (!title?.trim() || !parsed) {
    return res.status(400).json({ message: "Enter a title and a valid YouTube video link." });
  }

  try {
    const video = await LearningVideo.create({
      title: title.trim(),
      description: (description || "").trim(),
      category: (category || "General").trim(),
      language: (language || "Malayalam").trim(),
      videoUrl: parsed.canonicalUrl,
      embedUrl: parsed.embedUrl,
      postedBy: req.user.name || req.user.email || "Main Admin",
    });
    res.status(201).json({ message: "Learning video published.", video });
  } catch (error) {
    res.status(500).json({ message: "Unable to publish this video." });
  }
};

const deleteLearningVideo = async (req, res) => {
  try {
    const video = await LearningVideo.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json({ message: "Learning video removed." });
  } catch (error) {
    res.status(400).json({ message: "Unable to remove this video." });
  }
};

module.exports = { listLearningVideos, publishLearningVideo, deleteLearningVideo };
