const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  studentId: String,
  password: String,
  role: { type: String, default: "student" }
});

module.exports = mongoose.model("User", userSchema);