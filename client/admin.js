let questionCount = 0;

function createUserLookup(users) {
  const lookup = {};

  users.forEach(user => {
    if (user && user._id) {
      lookup[String(user._id)] = user;
    }
  });

  return lookup;
}

function getStudentLabel(userLookup, userId) {
  if (!userId) {
    return "Unknown User";
  }

  const matchedUser = userLookup[String(userId)];
  return matchedUser && matchedUser.studentId ? matchedUser.studentId : "Unknown User";
}

function formatDate(value) {
  if (!value) {
    return "No timestamp";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `Request failed: ${url}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload && errorPayload.message) {
        message = errorPayload.message;
      }
    } catch (error) {
      console.error("FETCH JSON PARSE ERROR:", error);
    }

    throw new Error(message);
  }

  return response.json();
}

function renderUsers(users) {
  const container = document.getElementById("users");

  if (!users.length) {
    container.innerHTML = '<p class="empty-state">No users found.</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="item-card">
      <div class="item-title">${user.studentId || "Unknown User"}</div>
      <div class="item-meta">Role: ${user.role || "student"}</div>
    </div>
  `).join("");
}

function renderLogs(logs, userLookup) {
  const container = document.getElementById("logs");

  if (!logs.length) {
    container.innerHTML = '<p class="empty-state">No logs available.</p>';
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="item-card log-item">
      <div class="item-title">${getStudentLabel(userLookup, log.userId)}</div>
      <div class="item-meta">${log.event || "No event recorded"}</div>
      <div class="item-subtle">${formatDate(log.timestamp)}</div>
    </div>
  `).join("");
}

function renderRecordings(recordings, userLookup) {
  const container = document.getElementById("videos");

  if (!recordings.length) {
    container.innerHTML = '<p class="empty-state">No recordings uploaded yet.</p>';
    return;
  }

  container.innerHTML = recordings.map(recording => {
    const safeFileName = recording.filePath || "";

    return `
      <article class="video-card">
        <div class="video-card-header">
          <div class="item-title">${getStudentLabel(userLookup, recording.userId)}</div>
          <div class="item-subtle">${formatDate(recording.createdAt)}</div>
        </div>
        <video controls preload="metadata">
          <source src="/recordings/${encodeURIComponent(safeFileName)}" type="video/webm">
          Your browser does not support embedded videos.
        </video>
        <div class="item-meta">File: ${safeFileName || "Missing filename"}</div>
      </article>
    `;
  }).join("");
}

function renderAnalytics(analytics) {
  const summary = document.getElementById("analyticsSummary");
  const tableBody = document.getElementById("analyticsTableBody");

  summary.innerHTML = `
    <article class="stat-card">
      <p class="stat-label">Total Users</p>
      <h3>${analytics.totalUsers || 0}</h3>
    </article>
    <article class="stat-card">
      <p class="stat-label">Total Logs</p>
      <h3>${analytics.totalLogs || 0}</h3>
    </article>
    <article class="stat-card">
      <p class="stat-label">Total Recordings</p>
      <h3>${analytics.totalRecordings || 0}</h3>
    </article>
  `;

  if (!analytics.perStudentStats || !analytics.perStudentStats.length) {
    tableBody.innerHTML = '<tr><td colspan="3" class="table-empty">No analytics available.</td></tr>';
    drawAnalyticsChart([]);
    return;
  }

  tableBody.innerHTML = analytics.perStudentStats.map(student => `
    <tr>
      <td>${student.studentId || "Unknown User"}</td>
      <td>${student.tabSwitches || 0}</td>
      <td>${student.recordingsCount || 0}</td>
    </tr>
  `).join("");

  drawAnalyticsChart(analytics.perStudentStats);
}

function drawAnalyticsChart(perStudentStats) {
  const canvas = document.getElementById("analyticsChart");
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!perStudentStats.length) {
    context.fillStyle = "#667085";
    context.font = "16px Segoe UI";
    context.fillText("No analytics data to chart yet.", 24, 40);
    return;
  }

  const chartData = perStudentStats.slice(0, 6);
  const maxValue = Math.max(...chartData.map(item => item.tabSwitches), 1);
  const chartHeight = 170;
  const baseY = 210;
  const barWidth = 68;
  const gap = 36;
  const startX = 36;

  context.strokeStyle = "#d9e2f2";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(24, baseY);
  context.lineTo(canvas.width - 24, baseY);
  context.stroke();

  chartData.forEach((item, index) => {
    const barHeight = (item.tabSwitches / maxValue) * chartHeight;
    const x = startX + index * (barWidth + gap);
    const y = baseY - barHeight;

    context.fillStyle = "#dbeafe";
    context.fillRect(x, y, barWidth, barHeight);

    context.fillStyle = "#1d4ed8";
    context.fillRect(x, y + Math.max(barHeight - 26, 0), barWidth, Math.min(26, barHeight));

    context.fillStyle = "#162033";
    context.font = "12px Segoe UI";
    context.fillText(String(item.tabSwitches || 0), x + 24, y - 8);

    const studentLabel = String(item.studentId || "Unknown").slice(0, 10);
    context.fillStyle = "#475467";
    context.fillText(studentLabel, x, baseY + 18);
  });
}

function updateCreateExamMessage(message, type) {
  const messageElement = document.getElementById("createExamMessage");
  messageElement.textContent = message;
  messageElement.className = `inline-message ${type ? `is-${type}` : ""}`.trim();
}

function buildQuestionCard(questionIndex, questionData) {
  return `
    <article class="question-builder-card" data-question-index="${questionIndex}">
      <div class="builder-header">
        <h3>Question ${questionIndex + 1}</h3>
        ${questionIndex > 0 ? '<button type="button" class="secondary-button danger-button remove-question-btn">Remove</button>' : ""}
      </div>

      <label class="field-group">
        <span>Question</span>
        <input type="text" class="question-input" placeholder="Enter question text" value="${questionData.question}">
      </label>

      <div class="option-grid">
        <label class="field-group">
          <span>Option A</span>
          <input type="text" class="option-input" data-option-index="0" placeholder="Option A" value="${questionData.options[0]}">
        </label>
        <label class="field-group">
          <span>Option B</span>
          <input type="text" class="option-input" data-option-index="1" placeholder="Option B" value="${questionData.options[1]}">
        </label>
        <label class="field-group">
          <span>Option C</span>
          <input type="text" class="option-input" data-option-index="2" placeholder="Option C" value="${questionData.options[2]}">
        </label>
        <label class="field-group">
          <span>Option D</span>
          <input type="text" class="option-input" data-option-index="3" placeholder="Option D" value="${questionData.options[3]}">
        </label>
      </div>

      <label class="field-group">
        <span>Correct answer</span>
        <select class="correct-answer-select">
          <option value="">Select correct answer</option>
          <option value="${questionData.options[0]}" ${questionData.correctAnswer === questionData.options[0] ? "selected" : ""}>Option A</option>
          <option value="${questionData.options[1]}" ${questionData.correctAnswer === questionData.options[1] ? "selected" : ""}>Option B</option>
          <option value="${questionData.options[2]}" ${questionData.correctAnswer === questionData.options[2] ? "selected" : ""}>Option C</option>
          <option value="${questionData.options[3]}" ${questionData.correctAnswer === questionData.options[3] ? "selected" : ""}>Option D</option>
        </select>
      </label>
    </article>
  `;
}

function renumberQuestionCards() {
  const cards = Array.from(document.querySelectorAll(".question-builder-card"));

  cards.forEach((card, index) => {
    card.dataset.questionIndex = String(index);
    const heading = card.querySelector(".builder-header h3");

    if (heading) {
      heading.textContent = `Question ${index + 1}`;
    }
  });
}

function addQuestionCard(questionData) {
  const list = document.getElementById("questionBuilderList");
  const initialQuestion = questionData || {
    question: "",
    options: ["", "", "", ""],
    correctAnswer: ""
  };

  list.insertAdjacentHTML("beforeend", buildQuestionCard(questionCount, initialQuestion));
  questionCount += 1;

  const cards = document.querySelectorAll(".question-builder-card");
  syncCorrectAnswerOptions(cards[cards.length - 1]);
  renumberQuestionCards();
}

function syncCorrectAnswerOptions(card) {
  const optionInputs = Array.from(card.querySelectorAll(".option-input"));
  const select = card.querySelector(".correct-answer-select");
  const currentValue = select.value;
  const labels = ["A", "B", "C", "D"];

  select.innerHTML = '<option value="">Select correct answer</option>';

  optionInputs.forEach((input, index) => {
    const optionValue = input.value.trim();
    const optionElement = document.createElement("option");
    optionElement.value = optionValue;
    optionElement.textContent = optionValue ? `Option ${labels[index]}: ${optionValue}` : `Option ${labels[index]}`;

    if (currentValue && currentValue === optionValue) {
      optionElement.selected = true;
    }

    select.appendChild(optionElement);
  });
}

function collectExamPayload() {
  const title = document.getElementById("examTitle").value.trim();
  const questionCards = Array.from(document.querySelectorAll(".question-builder-card"));
  const questions = questionCards.map(card => {
    const question = card.querySelector(".question-input").value.trim();
    const options = Array.from(card.querySelectorAll(".option-input")).map(input => input.value.trim());
    const correctAnswer = card.querySelector(".correct-answer-select").value.trim();

    return { question, options, correctAnswer };
  });

  return { title, questions };
}

function resetExamBuilder() {
  questionCount = 0;
  document.getElementById("examTitle").value = "";
  document.getElementById("questionBuilderList").innerHTML = "";
  addQuestionCard();
}

function attachBuilderEvents() {
  document.getElementById("addQuestionBtn").addEventListener("click", () => {
    addQuestionCard();
  });

  document.getElementById("questionBuilderList").addEventListener("input", event => {
    const card = event.target.closest(".question-builder-card");

    if (!card) {
      return;
    }

    if (event.target.classList.contains("option-input")) {
      syncCorrectAnswerOptions(card);
    }
  });

  document.getElementById("questionBuilderList").addEventListener("click", event => {
    if (!event.target.classList.contains("remove-question-btn")) {
      return;
    }

    const cards = document.querySelectorAll(".question-builder-card");
    if (cards.length === 1) {
      updateCreateExamMessage("At least one question is required.", "error");
      return;
    }

    event.target.closest(".question-builder-card").remove();
    renumberQuestionCards();
  });

  document.getElementById("createExamForm").addEventListener("submit", async event => {
    event.preventDefault();
    updateCreateExamMessage("Creating exam...", "info");

    try {
      const payload = collectExamPayload();
      await fetchJson("/api/admin/create-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      resetExamBuilder();
      updateCreateExamMessage("Exam created successfully.", "success");
    } catch (error) {
      console.error("CREATE EXAM UI ERROR:", error);
      updateCreateExamMessage(error.message || "Failed to create exam.", "error");
    }
  });
}

async function loadDashboard() {
  const status = document.getElementById("adminStatus");

  try {
    const [users, logs, recordings, analytics] = await Promise.all([
      fetchJson("/api/admin/users"),
      fetchJson("/api/admin/logs"),
      fetchJson("/api/admin/recordings"),
      fetchJson("/api/admin/analytics")
    ]);

    const userLookup = createUserLookup(users);

    renderUsers(users);
    renderLogs(logs, userLookup);
    renderRecordings(recordings, userLookup);
    renderAnalytics(analytics);
    status.textContent = `Loaded ${users.length} users, ${logs.length} logs, ${recordings.length} recordings, and analytics.`;
  } catch (error) {
    console.error("ADMIN DASHBOARD LOAD ERROR:", error);
    status.textContent = "Failed to load dashboard data.";
    document.getElementById("users").innerHTML = '<p class="empty-state">Unable to load users.</p>';
    document.getElementById("logs").innerHTML = '<p class="empty-state">Unable to load logs.</p>';
    document.getElementById("videos").innerHTML = '<p class="empty-state">Unable to load recordings.</p>';
    document.getElementById("analyticsSummary").innerHTML = '<p class="empty-state">Unable to load analytics.</p>';
    document.getElementById("analyticsTableBody").innerHTML = '<tr><td colspan="3" class="table-empty">Unable to load analytics.</td></tr>';
    drawAnalyticsChart([]);
  }
}

addQuestionCard();
attachBuilderEvents();
loadDashboard();
