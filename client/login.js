const roleSelector = document.getElementById("roleSelector");
const loginFormSection = document.getElementById("loginFormSection");
const selectedRoleLabel = document.getElementById("selectedRoleLabel");
const changeRoleButton = document.getElementById("changeRoleButton");
const loginError = document.getElementById("loginError");
const studentIdInput = document.getElementById("studentId");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");

let selectedRole = "";

function showError(message) {
  loginError.textContent = message;
  loginError.classList.add("is-visible");
}

function clearError() {
  loginError.textContent = "";
  loginError.classList.remove("is-visible");
}

function updateRoleButtons() {
  document.querySelectorAll(".role-button").forEach(button => {
    button.classList.toggle("is-active", button.dataset.role === selectedRole);
  });
}

function selectRole(role) {
  selectedRole = role;
  localStorage.setItem("selectedRole", role);
  selectedRoleLabel.textContent = role === "admin" ? "Admin Login" : "Student Login";
  loginFormSection.hidden = false;
  loginFormSection.classList.add("is-visible");
  updateRoleButtons();
  clearError();
  studentIdInput.focus();
}

async function login() {
  const studentId = studentIdInput.value.trim();
  const password = passwordInput.value;

  if (!selectedRole) {
    showError("Select a role to continue.");
    return;
  }

  if (!studentId || !password) {
    showError("Enter your student ID and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  clearError();

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, password, role: selectedRole })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem("userId", data.userId);
    localStorage.setItem("studentId", data.studentId || studentId);
    localStorage.setItem("selectedRole", data.role);

    if (data.role === "admin") {
      window.location.href = "/admin.html";
      return;
    }

    localStorage.removeItem("precheckCompleted");
    localStorage.removeItem("latestExamResult");
    window.location.href = "/precheck.html";
  } catch (error) {
    showError(error.message || "Login failed");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Continue";
  }
}

roleSelector.addEventListener("click", event => {
  const roleButton = event.target.closest(".role-button");

  if (!roleButton) {
    return;
  }

  selectRole(roleButton.dataset.role);
});

changeRoleButton.addEventListener("click", () => {
  selectedRole = "";
  localStorage.removeItem("selectedRole");
  loginFormSection.hidden = true;
  loginFormSection.classList.remove("is-visible");
  updateRoleButtons();
  clearError();
});

studentIdInput.addEventListener("input", clearError);
passwordInput.addEventListener("input", clearError);
passwordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    login();
  }
});
loginButton.addEventListener("click", login);

const savedRole = localStorage.getItem("selectedRole");
if (savedRole === "student" || savedRole === "admin") {
  selectRole(savedRole);
}
