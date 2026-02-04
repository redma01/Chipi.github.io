
// GitHub Pages: Firebase Auth (Google) popup
// Dev bypass removed for production safety.

function login() {
    const message = document.getElementById("message");
    if (message) {
        message.textContent = "Signing in with Google...";
        message.style.color = "#2c7be5";
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    auth
        .signInWithPopup(provider)
        .then((result) => {
            const user = result?.user;
            const accessKey = (user?.uid || "PUBLIC").toUpperCase();
            sessionStorage.setItem("chipi_access_key", accessKey);
            if (message) {
                message.textContent = "Signed in! Redirecting...";
            }
            setTimeout(() => {
                window.location.href = "mainpage.html";
            }, 300);
        })
        .catch((error) => {
            console.error("Google sign-in error:", error);
            if (message) {
                message.style.color = "red";
                message.textContent = "Google sign-in failed. Please try again.";
            }
        });
}
