const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  userId: String,
  event: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Log", logSchema);