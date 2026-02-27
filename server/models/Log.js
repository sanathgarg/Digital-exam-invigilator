const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    studentId: String,
    sessionId: String,
    tabSwitchCount: {
        type: Number,
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Log", logSchema);