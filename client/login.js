async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    alert("Login failed");
    return;
  }

  const data = await res.json();

  localStorage.setItem("userId", data.userId);

  if (data.role === "admin") {
    window.location.href = "/admin.html";
  } else {
    window.location.href = "/exam.html";
  }
}