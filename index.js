
// Access keys are now validated server-side for security

function login() {
    const accessKey = document.getElementById("accessKey").value.trim().toUpperCase();
    const message = document.getElementById("message");

    message.textContent = "Validating...";
    message.style.color = "#2c7be5";

    // Validate key server-side
    fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Valid key, store session token
            sessionStorage.setItem("chipi_session", data.token);
            message.textContent = "Access granted! Redirecting...";
            setTimeout(() => {
                window.location.href = "mainpage.html";
            }, 1000);
        } else {
            message.style.color = "red";
            message.textContent = "Invalid access key. Please try again.";
        }
    })
    .catch(error => {
        message.style.color = "red";
        message.textContent = "Connection error. Please try again.";
        console.error("Login error:", error);
    });
}
