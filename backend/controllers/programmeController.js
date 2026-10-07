const Programme = require("../models/Programme");

const createProgramme = async (req, res) => {
  try {
    const programme = await Programme.create(req.body);
    res.status(201).json({ message: "Programme scheduled successfully", programme });
  } catch (err) {
    res.status(500).json({ message: "Failed to create programme", error: err.message });
  }
};

const getProgrammes = async (req, res) => {
  try {
    const programmes = await Programme.find({}).sort({ date: 1, createdAt: -1 });
    res.status(200).json({ programmes });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch programmes", error: err.message });
  }
};

const updateProgramme = async (req, res) => {
  try {
    const programme = await Programme.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Programme updated", programme });
  } catch (err) {
    res.status(500).json({ message: "Failed to update programme", error: err.message });
  }
};

const deleteProgramme = async (req, res) => {
  try {
    await Programme.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Programme deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete programme", error: err.message });
  }
};

module.exports = { createProgramme, getProgrammes, updateProgramme, deleteProgramme };
