const screenStatus = document.getElementById("screenStatus");
const cameraStatus = document.getElementById("cameraStatus");
const requestScreenButton = document.getElementById("requestScreenButton");
const requestCameraButton = document.getElementById("requestCameraButton");
const startExamButton = document.getElementById("startExamButton");
const precheckMessage = document.getElementById("precheckMessage");

let screenGranted = false;
let cameraGranted = false;
let screenStream;
let cameraStream;

if (!localStorage.getItem("userId")) {
  window.location.href = "/";
}

function updateBadge(element, granted) {
  element.textContent = granted ? "Granted" : "Not granted";
  element.className = `status-badge ${granted ? "status-success" : "status-pending"}`;
}

function updateState() {
  updateBadge(screenStatus, screenGranted);
  updateBadge(cameraStatus, cameraGranted);
  startExamButton.disabled = !(screenGranted && cameraGranted);

  if (screenGranted && cameraGranted) {
    precheckMessage.textContent = "Permissions confirmed. You can start the exam now.";
    precheckMessage.className = "inline-message is-success";
  } else {
    precheckMessage.textContent = "Grant both permissions to continue.";
    precheckMessage.className = "inline-message is-info";
  }
}

async function requestScreenPermission() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    screenGranted = true;
    const [track] = screenStream.getVideoTracks();
    if (track) {
      track.addEventListener("ended", () => {
        screenGranted = false;
        updateState();
      });
    }
  } catch (error) {
    console.error("SCREEN PERMISSION ERROR:", error);
    screenGranted = false;
    precheckMessage.textContent = "Screen recording permission is required to start the exam.";
    precheckMessage.className = "inline-message is-error";
  }

  updateState();
}

async function requestCameraPermission() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    cameraGranted = true;
    const [track] = cameraStream.getVideoTracks();
    if (track) {
      track.addEventListener("ended", () => {
        cameraGranted = false;
        updateState();
      });
    }
  } catch (error) {
    console.error("CAMERA PERMISSION ERROR:", error);
    cameraGranted = false;
    precheckMessage.textContent = "Webcam permission is required to start the exam.";
    precheckMessage.className = "inline-message is-error";
  }

  updateState();
}

function releaseStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach(track => track.stop());
}

requestScreenButton.addEventListener("click", requestScreenPermission);
requestCameraButton.addEventListener("click", requestCameraPermission);
startExamButton.addEventListener("click", () => {
  if (!(screenGranted && cameraGranted)) {
    precheckMessage.textContent = "Grant both permissions before starting the exam.";
    precheckMessage.className = "inline-message is-error";
    return;
  }

  localStorage.setItem("precheckCompleted", "true");
  releaseStream(screenStream);
  releaseStream(cameraStream);
  window.location.href = "/exam.html";
});

window.addEventListener("beforeunload", () => {
  releaseStream(screenStream);
  releaseStream(cameraStream);
});

updateState();
