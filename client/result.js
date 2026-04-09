const resultPayload = JSON.parse(localStorage.getItem("latestExamResult") || "null");

if (!resultPayload) {
  window.location.href = "/";
} else {
  function updateResultView() {
    document.getElementById("scoreValue").textContent = resultPayload.score ?? 0;
    document.getElementById("totalValue").textContent = resultPayload.total ?? 0;
    document.getElementById("percentageValue").textContent = `${resultPayload.percentage ?? 0}%`;
    document.getElementById("studentIdValue").textContent = resultPayload.studentId || localStorage.getItem("studentId") || "-";
    document.getElementById("examTitleValue").textContent = resultPayload.examTitle || "Online Examination";
  }

  function logout() {
    localStorage.removeItem("userId");
    localStorage.removeItem("studentId");
    localStorage.removeItem("selectedRole");
    localStorage.removeItem("precheckCompleted");
    localStorage.removeItem("latestExamResult");
    window.location.href = "/";
  }

  document.getElementById("goHomeButton").addEventListener("click", () => {
    localStorage.removeItem("latestExamResult");
    localStorage.removeItem("precheckCompleted");
    window.location.href = "/";
  });

  document.getElementById("logoutButton").addEventListener("click", logout);

  updateResultView();
}
