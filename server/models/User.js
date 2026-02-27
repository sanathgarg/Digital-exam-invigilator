const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    studentId: String,
    password: String
});

module.exports = mongoose.model("User", userSchema);