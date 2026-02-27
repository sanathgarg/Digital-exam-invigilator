let sessionId;

window.onload = function() {
    const studentId = localStorage.getItem("studentId");

    fetch("http://localhost:5000/start-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
    })
    .then(res => res.json())
    .then(data => {
        sessionId = data.sessionId;
        console.log("Session started:", sessionId);
    });
};
//  LOGIN 
function login() {
    let id = document.getElementById("studentId").value;
    let pass = document.getElementById("password").value;

    fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            studentId: id,
            password: pass
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem("studentId", id);
            window.location.href = "exam.html";
        } else {
            document.getElementById("error").innerText = "Invalid Credentials";
        }
    })
    .catch(err => {
        console.error(err);
        document.getElementById("error").innerText = "Server error";
    });
}
//  TIMER 
let totalTime = 120; 
if (document.getElementById("time")) {
    let timer = setInterval(function () {
        let minutes = Math.floor(totalTime / 60);
        let seconds = totalTime % 60;

        document.getElementById("time").innerText =
            minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);

        totalTime--;

        if (totalTime < 0) {
            clearInterval(timer);
            alert("Time's Up! Exam Submitted.");
            submitExam();
        }
    }, 1000);
}

// TAB SWITCH DETECTION 
let tabSwitchCount = 0;

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
       tabSwitchCount++;
        document.getElementById("tabCount").innerText = tabSwitchCount;

    fetch("http://localhost:5000/log-tab", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
        studentId: localStorage.getItem("studentId"),
        sessionId: sessionId
})
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));

alert("Warning! Tab switching detected.");
    }
});

//  DISABLE RIGHT CLICK 
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

document.addEventListener("copy", function (e) {
    e.preventDefault();
});

function submitExam() {
    alert("Exam Submitted Successfully!");
    window.location.href = "index.html";
}