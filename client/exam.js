const userId = localStorage.getItem("userId");
let timeLeft = 600;
let timerInterval;
let tabSwitchCount = 0;
let mediaRecorder;
let recordedChunks = [];
let isSubmitting = false;

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        document.getElementById("time").innerText =
            `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
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

async function logTabSwitch() {
    await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: userId,
            event: "tab-switch"
        })
    });
}

document.addEventListener("visibilitychange", async () => {
    if (!document.hidden) {
        return;
    }

    tabSwitchCount++;
    showTabWarning();

    try {
        await logTabSwitch();
    } catch (error) {
        console.error("TAB SWITCH LOG ERROR:", error);
    }

    // Optional advanced behavior enabled: submit automatically after 3 tab switches.
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

        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.start();
    } catch (error) {
        console.error("Recording error:", error);
    }
}

function stopRecordingAndUpload() {
    return new Promise((resolve) => {
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

function renderExam(exam) {
    const examForm = document.getElementById("examForm");
    const heading = document.getElementById("examTitleHeading");

    heading.textContent = exam.title || "Online Examination";

    if (!exam.questions || !exam.questions.length) {
        examForm.innerHTML = '<p class="empty-state">No questions found for this exam.</p>';
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

        const exam = await response.json();
        renderExam(exam);
    } catch (error) {
        console.error("LOAD EXAM ERROR:", error);
        examForm.innerHTML = '<p class="empty-state">No exam is available right now.</p>';
    }
}

async function submitExam(message) {
    if (isSubmitting) {
        return;
    }

    isSubmitting = true;
    clearInterval(timerInterval);

    if (message) {
        window.alert(message);
    } else {
        window.alert("Exam Submitted!");
    }

    await stopRecordingAndUpload();
    window.location.href = "/";
}

loadLatestExam();
startTimer();
startRecording();
