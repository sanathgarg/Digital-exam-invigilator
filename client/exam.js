const userId = localStorage.getItem("userId");
const studentId = localStorage.getItem("studentId");
const precheckCompleted = localStorage.getItem("precheckCompleted");

let timeLeft = 600;
let timerInterval;
let tabSwitchCount = 0;
let mediaRecorder;
let recordedChunks = [];
let isSubmitting = false;
let activeExam = null;
let webcamStream = null;
let webcamCheckInterval;
let cameraIssueLogged = false;

const webcamPreview = document.getElementById("webcamPreview");
const cameraHealth = document.getElementById("cameraHealth");
const cameraHealthMini = document.getElementById("cameraHealthMini");
const monitorMessage = document.getElementById("monitorMessage");
const submitExamButton = document.getElementById("submitExamButton");

if (!userId) {
    window.location.href = "/";
}

if (precheckCompleted !== "true") {
    window.location.href = "/precheck.html";
}

function setMonitorState(message, type, badgeText) {
    monitorMessage.textContent = message;
    monitorMessage.className = `inline-message is-${type}`;
    cameraHealth.textContent = badgeText;
    cameraHealth.className = `status-badge ${type === "success" ? "status-success" : type === "error" ? "status-danger" : "status-pending"}`;
    cameraHealthMini.className = `status-dot ${type === "success" ? "status-success" : type === "error" ? "status-danger" : "status-pending"}`;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 1;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        document.getElementById("time").innerText =
            `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam("Exam submitted because the timer ended.");
        }
    }, 1000);
}

function showTabWarning() {
    const popup = document.getElementById("tabWarningPopup");
    popup.classList.add("is-visible");

    window.clearTimeout(showTabWarning.timeoutId);
    showTabWarning.timeoutId = window.setTimeout(() => {
        popup.classList.remove("is-visible");
    }, 1800);
}

async function sendLog(event) {
    try {
        await fetch("/api/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                event
            })
        });
    } catch (error) {
        console.error("LOG ERROR:", error);
    }
}

async function logTabSwitch() {
    await sendLog("tab-switch");
}

document.addEventListener("visibilitychange", async () => {
    if (!document.hidden) {
        return;
    }

    tabSwitchCount += 1;
    showTabWarning();
    await logTabSwitch();

    if (tabSwitchCount >= 3) {
        submitExam("Exam submitted after repeated tab switching.");
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack) {
            videoTrack.addEventListener("ended", () => {
                sendLog("screen-share-stopped");
            });
        }

        mediaRecorder.start();
    } catch (error) {
        console.error("RECORDING ERROR:", error);
        await sendLog("screen-share-not-available");
    }
}

function stopRecordingAndUpload() {
    return new Promise(resolve => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            resolve();
            return;
        }

        mediaRecorder.onstop = async () => {
            try {
                const blob = new Blob(recordedChunks, { type: "video/webm" });
                const formData = new FormData();

                formData.append("video", blob, "recording.webm");
                formData.append("userId", userId);

                await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });
            } catch (error) {
                console.error("UPLOAD RECORDING ERROR:", error);
            }

            resolve();
        };

        mediaRecorder.stop();
    });
}

function stopWebcamMonitoring() {
    window.clearInterval(webcamCheckInterval);

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
}

async function startWebcamMonitoring() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        webcamPreview.srcObject = webcamStream;
        setMonitorState("Webcam is active and being monitored.", "success", "Webcam active");

        const [videoTrack] = webcamStream.getVideoTracks();
        if (!videoTrack) {
            cameraIssueLogged = true;
            setMonitorState("No webcam stream detected.", "error", "No webcam stream");
            await sendLog("webcam-no-stream");
            return;
        }

        videoTrack.addEventListener("ended", async () => {
            setMonitorState("Webcam stopped during the exam.", "error", "Webcam stopped");
            await sendLog("webcam-stopped");
        });

        webcamCheckInterval = window.setInterval(async () => {
            const track = webcamStream && webcamStream.getVideoTracks()[0];
            const hasLiveTrack = Boolean(track) && track.readyState === "live" && track.enabled;

            if (hasLiveTrack) {
                cameraIssueLogged = false;
                setMonitorState("Webcam is active and being monitored.", "success", "Webcam active");
                return;
            }

            setMonitorState("Webcam stream is missing or inactive.", "error", "Stream issue");

            if (!cameraIssueLogged) {
                cameraIssueLogged = true;
                await sendLog(track ? "webcam-stopped" : "webcam-no-stream");
            }
        }, 5000);
    } catch (error) {
        console.error("WEBCAM ERROR:", error);
        setMonitorState("Unable to access webcam. Exam monitoring has logged the issue.", "error", "Webcam unavailable");
        await sendLog("webcam-no-stream");
    }
}

function renderExam(exam) {
    const examForm = document.getElementById("examForm");
    const heading = document.getElementById("examTitleHeading");

    heading.textContent = exam.title || "Online Examination";

    if (!exam.questions || !exam.questions.length) {
        examForm.innerHTML = '<p class="empty-state">No questions found for this exam.</p>';
        submitExamButton.disabled = true;
        return;
    }

    examForm.innerHTML = exam.questions.map((questionItem, questionIndex) => `
        <article class="question exam-question-card">
            <p class="question-title">${questionIndex + 1}. ${questionItem.question}</p>
            <div class="options-list">
                ${questionItem.options.map((option, optionIndex) => `
                    <label class="option-row">
                        <input type="radio" name="question-${questionIndex}" value="${option}">
                        <span>${String.fromCharCode(65 + optionIndex)}. ${option}</span>
                    </label>
                `).join("")}
            </div>
        </article>
    `).join("");
}

async function loadLatestExam() {
    const examForm = document.getElementById("examForm");

    try {
        const response = await fetch("/api/exam/latest");

        if (!response.ok) {
            throw new Error("Unable to load exam");
        }

        activeExam = await response.json();
        renderExam(activeExam);
    } catch (error) {
        console.error("LOAD EXAM ERROR:", error);
        examForm.innerHTML = '<p class="empty-state">No exam is available right now.</p>';
        submitExamButton.disabled = true;
    }
}

function collectAnswers() {
    const answers = {};

    if (!activeExam || !Array.isArray(activeExam.questions)) {
        return answers;
    }

    activeExam.questions.forEach((questionItem, questionIndex) => {
        const selectedOption = document.querySelector(`input[name="question-${questionIndex}"]:checked`);
        answers[String(questionIndex)] = selectedOption ? selectedOption.value : "";
    });

    return answers;
}

async function submitExam(message) {
    if (isSubmitting) {
        return;
    }

    isSubmitting = true;
    submitExamButton.disabled = true;
    clearInterval(timerInterval);
    stopWebcamMonitoring();

    if (message) {
        window.alert(message);
    }

    try {
        const answers = collectAnswers();
        const response = await fetch("/api/exam/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                answers,
                userId
            })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.message || "Failed to submit exam");
        }

        localStorage.setItem("latestExamResult", JSON.stringify({
            ...result,
            studentId,
            examTitle: activeExam && activeExam.title ? activeExam.title : "Online Examination"
        }));

        await stopRecordingAndUpload();
        localStorage.removeItem("precheckCompleted");
        window.location.href = "/result.html";
    } catch (error) {
        console.error("SUBMIT EXAM ERROR:", error);
        window.alert(error.message || "Failed to submit exam.");
        isSubmitting = false;
        submitExamButton.disabled = false;
        startTimer();
        startWebcamMonitoring();
    }
}

submitExamButton.addEventListener("click", () => submitExam("Exam submitted successfully."));

loadLatestExam();
startTimer();
startRecording();
startWebcamMonitoring();
window.addEventListener("beforeunload", stopWebcamMonitoring);
