const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Log = require("./models/Log");
const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

// Connect to Local MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/digitalExam")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Test route
app.get("/", (req, res) => {
    res.send("Server is running");
});
app.post("/login", async (req, res) => {
    const { studentId, password } = req.body;

    const user = await User.findOne({ studentId, password });

    if (user) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});
app.post("/start-exam", async (req, res) => {
    const { studentId } = req.body;

    const sessionId = Math.random().toString(36).substring(2, 10);

    const newSession = new Log({
        studentId,
        sessionId
    });

    await newSession.save();

    res.json({ sessionId });
});
app.post("/log-tab", async (req, res) => {
    try {
        const { studentId, sessionId } = req.body;

        await Log.findOneAndUpdate(
            { studentId, sessionId },
            { $inc: { tabSwitchCount: 1 } }
        );

        res.json({ message: "Tab switch updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error logging tab switch" });
    }
});
app.listen(5000, () => {
    console.log("Server running on port 5000");
});