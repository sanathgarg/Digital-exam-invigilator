const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const User = require("./models/User");
const Log = require("./models/Log");
const Recording = require("./models/Recording");
const Exam = require("./models/Exam");

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

/* ================== DATABASE ================== */
mongoose.connect("mongodb://127.0.0.1:27017/digitalExam")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

/* ================== FILE UPLOAD ================== */
// Ensure the recording upload directory exists before multer writes files.
const recordingsDir = path.join(__dirname, "../uploads/recordings");
if (fs.existsSync(recordingsDir)) {
  const recordingsPathStat = fs.statSync(recordingsDir);

  // Recover automatically if a file exists where the recordings folder should be.
  if (!recordingsPathStat.isDirectory()) {
    console.log("UPLOAD SETUP: Replacing file with recordings directory:", recordingsDir);
    fs.unlinkSync(recordingsDir);
  }
}

fs.mkdirSync(recordingsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("UPLOAD DESTINATION:", recordingsDir);
    cb(null, recordingsDir);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".webm";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    console.log("UPLOAD FILENAME:", uniqueName);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* ================== SERVE RECORDINGS ================== */
app.use("/recordings", express.static(recordingsDir));

/* ================== LOGIN ================== */
app.post("/api/login", async (req, res) => {
  const { studentId, username, password, role } = req.body;
  const submittedStudentId = String(studentId || username || "").trim();

  console.log("LOGIN INPUT:", submittedStudentId, role);

  const user = await User.findOne({ studentId: submittedStudentId });

  console.log("DB RESULT:", user);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (role && user.role !== role) {
    return res.status(401).json({ message: `This account is not registered as ${role}.` });
  }

  res.json({
    role: user.role || "student",
    userId: user._id,
    studentId: user.studentId
  });
});

/* ================== SAVE LOG ================== */
app.post("/api/log", async (req, res) => {
  const { userId, event } = req.body;

  await Log.create({ userId, event });

  res.json({ message: "Log saved" });
});

/* ================== ADMIN CREATE EXAM ================== */
app.post("/api/admin/create-exam", async (req, res) => {
  try {
    const { title, questions } = req.body;

    const normalizedTitle = String(title || "").trim();
    const normalizedQuestions = Array.isArray(questions)
      ? questions.map(questionItem => ({
          question: String(questionItem.question || "").trim(),
          options: Array.isArray(questionItem.options)
            ? questionItem.options.map(option => String(option || "").trim())
            : [],
          correctAnswer: String(questionItem.correctAnswer || "").trim()
        }))
      : [];

    const validQuestions = normalizedQuestions.filter(questionItem => {
      return questionItem.question
        && questionItem.options.length === 4
        && questionItem.options.every(Boolean)
        && questionItem.correctAnswer;
    });

    if (!normalizedTitle) {
      return res.status(400).json({ message: "Exam title is required" });
    }

    if (!validQuestions.length) {
      return res.status(400).json({ message: "At least one complete question is required" });
    }

    const createdExam = await Exam.create({
      title: normalizedTitle,
      questions: validQuestions
    });

    res.json({ message: "Exam created", examId: createdExam._id });
  } catch (error) {
    console.error("CREATE EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to create exam" });
  }
});

/* ================== LATEST EXAM ================== */
app.get("/api/exam/latest", async (req, res) => {
  try {
    const latestExam = await Exam.findOne().sort({ createdAt: -1 });

    if (!latestExam) {
      return res.status(404).json({ message: "No exam available" });
    }

    res.json({
      _id: latestExam._id,
      title: latestExam.title,
      createdAt: latestExam.createdAt,
      questions: Array.isArray(latestExam.questions)
        ? latestExam.questions.map(questionItem => ({
            question: questionItem.question,
            options: questionItem.options
          }))
        : []
    });
  } catch (error) {
    console.error("LATEST EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to load exam" });
  }
});

/* ================== SUBMIT EXAM ================== */
app.post("/api/exam/submit", async (req, res) => {
  try {
    const { answers, userId } = req.body;
    const latestExam = await Exam.findOne().sort({ createdAt: -1 });

    if (!latestExam || !Array.isArray(latestExam.questions) || !latestExam.questions.length) {
      return res.status(404).json({ message: "No exam available for evaluation" });
    }

    const normalizedAnswers = answers && typeof answers === "object" ? answers : {};
    let score = 0;

    latestExam.questions.forEach((questionItem, index) => {
      const submittedAnswer = String(normalizedAnswers[String(index)] || "").trim();
      const correctAnswer = String(questionItem.correctAnswer || "").trim();

      if (submittedAnswer && submittedAnswer === correctAnswer) {
        score += 1;
      }
    });

    const total = latestExam.questions.length;
    const percentage = total ? Number(((score / total) * 100).toFixed(2)) : 0;

    if (userId) {
      await Log.create({ userId, event: "exam-submitted" });
    }

    res.json({ score, total, percentage });
  } catch (error) {
    console.error("SUBMIT EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to evaluate exam" });
  }
});

/* ================== SAVE RECORDING ================== */
app.post("/api/upload", upload.single("video"), async (req, res) => {
  try {
    const { userId } = req.body;

    // Helpful upload logs to trace client uploads and saved filenames.
    console.log("UPLOAD REQUEST BODY:", req.body);
    console.log("UPLOAD REQUEST FILE:", req.file);

    if (!req.file) {
      console.log("UPLOAD ERROR: No file received by multer");
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!userId) {
      console.log("UPLOAD ERROR: Missing userId");
      return res.status(400).json({ message: "Missing userId" });
    }

    const fileNameOnly = path.basename(req.file.filename);
    const savedFilePath = path.join(recordingsDir, fileNameOnly);

    if (!fs.existsSync(savedFilePath)) {
      console.log("UPLOAD ERROR: File missing after multer save", savedFilePath);
      return res.status(500).json({ message: "Recording file was not saved" });
    }

    const savedRecording = await Recording.create({
      userId: String(userId),
      filePath: fileNameOnly
    });

    console.log("UPLOAD SAVED RECORDING:", savedRecording);
    res.json({ message: "Recording saved", recordingId: savedRecording._id });
  } catch (err) {
    console.error("UPLOAD FAILED:", err);
    res.status(500).json({ message: "Failed to save recording" });
  }
});

/* ================== ADMIN APIs ================== */

/* USERS */
app.get("/api/admin/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

/* LOGS */
app.get("/api/admin/logs", async (req, res) => {
  const logs = await Log.find().sort({ timestamp: -1 });
  res.json(logs);
});

/* RECORDINGS */
app.get("/api/admin/recordings", async (req, res) => {
  const recs = await Recording.find().sort({ createdAt: -1 });
  res.json(recs);
});

/* ANALYTICS */
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const [users, logs, recordings] = await Promise.all([
      User.find(),
      Log.find(),
      Recording.find()
    ]);

    const perStudentStats = users.map(user => {
      const userId = String(user._id);
      const tabSwitches = logs.filter(log => String(log.userId) === userId && log.event === "tab-switch").length;
      const recordingsCount = recordings.filter(recording => String(recording.userId) === userId).length;

      return {
        studentId: user.studentId || "Unknown User",
        tabSwitches,
        recordingsCount
      };
    });

    res.json({
      totalUsers: users.length,
      totalLogs: logs.length,
      totalRecordings: recordings.length,
      perStudentStats
    });
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Failed to load analytics" });
  }
});

/* ================== START ================== */
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
