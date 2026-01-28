// List of valid access keys
const validKeys = [
    "ABCD123456",
    "EFGH789012",
    "IJKL345678",
    "MNOP901234",
    "QRST567890",
    "UVWX123456",
    "YZAB789012",
    "CDEF345678",
    "GHIJ901234",
    "KLMN567890",
    "OPQR123456",
    "STUV789012",
    "WXYZ345678",
    "ABCD901234",
    "EFGH567890",
    "IJKL123456",
    "MNOP789012",
    "QRST345678",
    "UVWX901234",
    "YZAB567890"
];

function login() {
    const accessKey = document.getElementById("accessKey").value.trim().toUpperCase();
    const message = document.getElementById("message");

    if (validKeys.includes(accessKey)) {
        // Valid key, store it in sessionStorage
        sessionStorage.setItem("chipi_access_key", accessKey);
        message.style.color = "#2c7be5";
        message.textContent = "Access granted! Redirecting...";
        // Redirect to main page after successful login
        setTimeout(() => {
            window.location.href = "mainpage.html";
        }, 1000);
    } else {
        // Invalid key
        message.style.color = "red";
        message.textContent = "Invalid access key. Please try again.";
    }
}
