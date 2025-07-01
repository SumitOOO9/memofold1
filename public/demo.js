document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.toLowerCase();
  const API_BASE = "http://localhost:3000/api";

  // ========== LOGIN ==========
  if (path.includes("login.html")) {
    const loginForm = document.querySelector("form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usernameInput.value.trim(),
            password: passwordInput.value.trim(),
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Login failed: ${data.message || data.error || "Unknown error"}`);
          return;
        }

        localStorage.setItem("token", data.token);
        alert("Login successful!");
        window.location.href = "updMain.html";
      } catch (err) {
        console.error("Login error:", err);
        alert("Login failed. Check internet or server.");
      }
    });
  }

  // ========== SIGNUP ==========
  if (path.includes("signin.html")) {
    const signUpForm = document.querySelector("form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password");

    signUpForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (passwordInput.value !== confirmPassword.value) {
        alert("Passwords do not match.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usernameInput.value.trim(),
            password: passwordInput.value.trim(),
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Signup failed: ${data.message || data.error || "Unknown error"}`);
          return;
        }

        alert("Signup successful! Please log in.");
        window.location.href = "login.html";
      } catch (err) {
        console.error("Signup error:", err);
        alert("Signup failed. Check internet or server.");
      }
    });
  }

  // =====================
  // FORGOT PASSWORD PAGE FUNCTIONALITY
  // =====================
  if (path.includes("forgotpass.html")) {
    const forgotForm = document.querySelector("form");
    const input = forgotForm?.querySelector("input");

    if (forgotForm && input) {
      forgotForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const value = input.value.trim();

        if (value === "") {
          alert("Please enter your email or username.");
          input.focus();
          return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value) && value.includes(" ")) {
          alert("Please enter a valid email or username.");
          input.focus();
          return;
        }

        alert("If an account exists, a password reset link has been sent.");
        input.value = "";
      });
    }

    const backLink = document.querySelector(".back-link a");
    if (backLink) {
      backLink.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "login.html";
      });
    }
  }

  // =====================
  // PROFILE DASHBOARD FUNCTIONALITY (updMain.html)
  // =====================
  if (path.includes("updmain.html")) {
    const homeBtn = document.getElementById("homeBtn");
    const calendar = document.getElementById("calendar");
    const selectedDateLabel = document.getElementById("selectedDateLabel");
    const postBtn = document.getElementById("postButton");
    const postContent = document.getElementById("postContent");
    const timeLabel = document.getElementById("timeLabel");
    const attachBtn = document.getElementById("attachBtn");
    const fileInput = document.getElementById("fileInput");
    const deleteBtn = document.getElementById("deleteBtn");
    const charCount = document.getElementById("charCount");
    const toggle = document.getElementById("darkModeToggle");

    // Home redirect
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }

    // Date display
    if (calendar && selectedDateLabel) {
      calendar.addEventListener("change", () => {
        selectedDateLabel.textContent = "Date: " + calendar.value;
      });
    }

    // Post button
    if (postBtn && postContent) {
    postBtn.addEventListener("click", async () => {
  const content = postContent.value.trim();
  const date = calendar?.value || new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  if (!content) return alert("Post content cannot be empty.");

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:3000/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, date, time }),
    });

    const result = await response.json();

    if (!response.ok) {
      return alert(`Failed to post: ${result.error || "Unknown error"}`);
    }

    // Success UI
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.textContent = "Posted successfully!";
    const rect = postBtn.getBoundingClientRect();
    popup.style.position = "absolute";
    popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2000);

    postContent.value = "";
    charCount.textContent = "0 characters";
  } catch (error) {
    console.error("Post error:", error);
    alert("Failed to post. Server error.");
  }
});

    }

    // Clock updater
    if (timeLabel) {
      function updateClock() {
        const now = new Date();
        timeLabel.textContent = "Time: " + now.toLocaleTimeString();
      }
      setInterval(updateClock, 1000);
      updateClock();
    }

    // File attach
    if (attachBtn && fileInput) {
      attachBtn.addEventListener("click", () => fileInput.click());
    }

    // Delete content
    if (deleteBtn && postContent && charCount) {
      deleteBtn.addEventListener("click", () => {
        postContent.value = "";
        charCount.textContent = "0 characters";
      });
    }

    // Character count
    if (postContent && charCount) {
      postContent.addEventListener("input", () => {
        charCount.textContent = `${postContent.value.length} characters`;
      });
    }

    // Dark mode toggle
    if (toggle) {
      toggle.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode", toggle.checked);
      });
    }
  }

  // =====================
  // OPTIONAL: Footer Smooth Transition
  // =====================
  const footerLinks = document.querySelectorAll(".footer-links a");
  footerLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      const url = this.getAttribute("href");
      document.body.style.opacity = "0.7";
      setTimeout(() => {
        window.location.href = url;
      }, 150);
    });
  });
});

// Redirect from updMain.html to profile.html
document.addEventListener("DOMContentLoaded", () => {
  const profileOption = document.querySelector(".dropdown-content span i.fa-user-circle");
  if (profileOption) {
    profileOption.parentElement.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  // Redirect from profile.html to updMain.html 
  const createPostBtn = document.querySelector(".navbar-post-btn");
  if (createPostBtn) {
    createPostBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "updMain.html";
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.querySelector(".login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "login.html";
    });
  }
});

// feedback page full functionality
document.addEventListener("DOMContentLoaded", () => {
  // Feedback menu redirection
  const feedbackOption = document.querySelector(".feedback-option");
  if (feedbackOption) {
    feedbackOption.addEventListener("click", () => {
      window.location.href = "feedback.html"; // ✅ Redirects correctly
    });
  }

  // Feedback form validation (for feedback.html)
  const form = document.querySelector(".feedback-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const type = form.type.value;
      const message = form.message.value.trim();

      if (!name) {
        alert("Please enter your full name.");
        form.name.focus();
        return;
      }

      if (!email) {
        alert("Please enter your email address.");
        form.email.focus();
        return;
      } else if (!validateEmail(email)) {
        alert("Please enter a valid email address.");
        form.email.focus();
        return;
      }

      if (!type) {
        alert("Please select the feedback type.");
        form.type.focus();
        return;
      }

      if (!message) {
        alert("Please enter your message.");
        form.message.focus();
        return;
      }

      alert("Thank you for your feedback, " + name + "!");
      form.reset();
    });

    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }
  }
});

// redirect from feedback back to updMain
document.addEventListener("DOMContentLoaded", () => {
  // Override back button behavior
  const backBtn = document.querySelector(".back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "updMain.html";  // redirect to updMain.html
    });
  }
});

// Redirect to updMain.html when the Go Back button is clicked
document.addEventListener("DOMContentLoaded", function () {
  const goBackBtn = document.getElementById("goBackBtn");

  if (goBackBtn) {
    goBackBtn.addEventListener("click", function () {
      window.location.href = "updMain.html";
    });
  }
});

// Redirect from help to login
document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.querySelector(".login-button");
  if (loginButton) {
    loginButton.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }
});

// Redirect from privacy to login 
document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.querySelector(".login-button");

  if (loginButton) {
    loginButton.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }
});

// Redirect from term to login
function redirectToLogin() {
  window.location.href = "login.html";
}

// Redirect from contact to login
document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.querySelector(".login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }
});