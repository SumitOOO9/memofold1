document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.toLowerCase();
  const API_BASE = "https://memofold1.onrender.com/api";


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
        localStorage.setItem("username", usernameInput.value.trim());
        localStorage.setItem("realname", data.realname);
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
    const emailInput = document.getElementById("email"); // ✅ New line
    const passwordInput = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password");
    const realnameInput = document.getElementById("realname");

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
            realname: realnameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(), // ✅ Include Gmail
            password: passwordInput.value.trim(),
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          alert(`Signup failed: ${data.message || data.error || "Unknown error"}`);
          return;
        }


        localStorage.setItem("username", usernameInput.value.trim());
        localStorage.setItem("realname", realnameInput.value.trim());

        alert("Signup successful! Please log in.");
        window.location.href = "login.html";
      } catch (err) {
        console.error("Signup error:", err);
        alert("Signup failed. Check internet or server.");
      }
    });
  }


  // =============================
  // FORGOT PASSWORD FUNCTIONALITY
  // =============================
  if (path.includes("forgotpass.html")) {
    const forgotForm = document.querySelector("form");
    const input = forgotForm?.querySelector("input");

    if (forgotForm && input) {
      forgotForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const value = input.value.trim();

        if (value === "") {
          alert("Please enter your email or username.");
          input.focus();
          return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailPattern.test(value);
        const isValidUsername = !value.includes(" ");

        if (!isEmail && !isValidUsername) {
          alert("Please enter a valid email or username.");
          input.focus();
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/auth/request-reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: value }) // Using "email" field for both email/username
          });

          const result = await response.json();

          if (!response.ok) {
            alert(result.error || "Reset request failed.");
            return;
          }

          alert("If an account exists, a password reset link has been sent to the registered email.");
          input.value = "";
        } catch (err) {
          console.error("Reset request error:", err);
          alert("Server error. Please try again later.");
        }
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

  // reset password FUNCTIONALITY
  // =============================
  if (path.includes("resetpass.html")) {
    const resetForm = document.getElementById("resetForm");
    const backBtn = document.querySelector(".back-btn");

    if (resetForm) {
      resetForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const password = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          alert("Invalid or expired reset link.");
          return;
        }

        if (password !== confirmPassword) {
          alert("Passwords do not match.");
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }) // ✅ Only send password
          });

          const result = await response.json();

          if (!response.ok) {
            alert(result.error || "Reset failed.");
            return;
          }

          alert("Password reset successful. You can now log in.");
          window.location.href = "login.html";
        } catch (err) {
          console.error("Password reset error:", err);
          alert("Server error. Please try again later.");
        }
      });
    }

    // 👇 This ensures Back to Login works correctly
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
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

    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }

    if (calendar && selectedDateLabel) {
      calendar.addEventListener("change", () => {
        selectedDateLabel.textContent = "Date: " + calendar.value;
      });
    }

    if (postBtn && postContent) {
      postBtn.addEventListener("click", async () => {
        const content = postContent.value.trim();
      
  const rawDate = calendar?.value;
  const date = rawDate && rawDate.trim() !== "" 
    ? rawDate 
    : new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

  const time = new Date().toLocaleTimeString();

        if (!content) return alert("Post content cannot be empty.");

        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE}/posts`, {
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

    if (timeLabel) {
      function updateClock() {
        const now = new Date();
        timeLabel.textContent = "Time: " + now.toLocaleTimeString();
      }
      setInterval(updateClock, 1000);
      updateClock();
    }

    if (attachBtn && fileInput) {
      attachBtn.addEventListener("click", () => fileInput.click());
    }

    if (deleteBtn && postContent && charCount) {
      deleteBtn.addEventListener("click", () => {
        postContent.value = "";
        charCount.textContent = "0 characters";
      });
    }

    if (postContent && charCount) {
      postContent.addEventListener("input", () => {
        charCount.textContent = `${postContent.value.length} characters`;
      });
    }

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

  // Redirect from updMain.html to profile.html
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

  //MainFeed Functionality
if (path.includes("mainFeed.html")) {

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "login.html";
      return;
    }
    // ✅ LOGOUT BUTTON HANDLER
    const logoutBtn = document.querySelector("#nav-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default <a> behavior
        localStorage.clear(); // Remove token and user info
        window.location.href = "login.html"; // Redirect to login
      });
    }


    const feed = document.getElementById("feed");

    fetch(`${API_BASE}/posts`, {

      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((posts) => {
         feed.innerHTML = ""; // Clear existing content
         console.log("Fetched posts:", posts); // 🔍 Check this in browser console
          posts.forEach((post) => {
            const imageUrl = post.image && post.image.trim() !== ""
            ? post.image
            : "https://via.placeholder.com/300x200?text=No+Image";

          const profilePic = post.profilePic?.trim()
            ? post.profilePic
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username)}&background=random`;

               const postCard = document.createElement("div");
        postCard.classList.add("user-post-card");
        postCard.innerHTML = `
          <div class="post-header">
            <img src="${profilePic}" alt="Profile pic" class="post-profile-pic" />
            <span class="username">@${post.username}</span>
          </div>
          ${imageUrl ? `<img class="post-img" src="${imageUrl}" alt="Post image" onerror="this.style.display='none'" />` : ""}
          <div class="post-content">${post.content}</div>
        `;
        feed.appendChild(postCard);
      });
    })
    .catch((err) => {
      console.error("Failed to fetch posts:", err);
    });
}


  // =====================
  // PROFILE PAGE: Show username
  // =====================
  if (path.includes("profile.html")) {
    const storedUsername = localStorage.getItem("username");
    const storedRealname = localStorage.getItem("realname");
    const usernameHeading = document.querySelector(".profile-info h2");
    const realnamePara = document.querySelector("#profile-name");       // Real Name
    const profilePicImg = document.getElementById("displayProfilePic");
    if (storedUsername && usernameHeading) {
      usernameHeading.textContent = `@${storedUsername}`;
    }

    if (storedRealname && realnamePara) {
      realnamePara.textContent = storedRealname;
    }

    async function loadProfilePicture() {
      try {
        const token = localStorage.getItem("token");
        if (!token || !profilePicImg) return;

        const res = await fetch(`${API_BASE}/user/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const user = await res.json();
          const pic = user.profilePic?.trim() || "https://ui-avatars.com/api/?name=User&background=random";
          profilePicImg.src = pic;
        }
      } catch (err) {
        console.error("Error loading profile picture:", err);
      }
    }

    const postsContainer = document.getElementById("userPosts");

    async function loadUserPosts() {
      try {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        const response = await fetch(`${API_BASE}/posts/user/${username}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        postsContainer.innerHTML = ""; // ✅ Clear previous posts every time


        if (!response.ok) {
          postsContainer.innerHTML = `<p class="error-message">Error loading posts: ${data.error || "Unknown error"}</p>`;
          return;
        }

        if (!data || data.length === 0) {
          postsContainer.innerHTML = `<p class="no-posts">You haven't posted anything yet.</p>`;
          return;
        }

        // Show posts
        data.reverse().forEach(post => {
          const imageUrl = post.image?.trim() ? post.image : "";

          const profilePic = post.profilePic?.trim()
            ? post.profilePic
            : "https://ui-avatars.com/api/?name=" + encodeURIComponent(post.username);

          const postDiv = document.createElement("div");
          postDiv.className = "user-post-card";
          postDiv.innerHTML = `
    <div class="post-header">
  <img src="${profilePic}" alt="Profile pic" class="post-profile-pic">
  <span class="username">@${post.username}</span>
</div>

      ${imageUrl ? `<img class="post-img" src="${imageUrl}" alt="" onerror="this.style.display='none'" />` : ""}


    <div class="post-content">${post.content}</div>
    <div class="post-meta">
      <span>Posted on: ${new Date(post.createdAt).toLocaleString()}</span>
    </div>
  `;
          postsContainer.appendChild(postDiv);
        });


      } catch (err) {
        console.error("Failed to load user posts:", err);
        postsContainer.innerHTML = "";
      }
    }

    loadUserPosts();  // Call it
    loadProfilePicture();

    // ================================
    // ✅ NEW: Handle profile picture upload
    // ================================
    const profilePicInput = document.getElementById("profilePicUpload");
    const profilePicForm = document.getElementById("profilePicForm");

    if (profilePicForm && profilePicInput) {
      profilePicInput.addEventListener("change", async () => {
        const file = profilePicInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("profilePic", file);

        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE}/user/upload-profile-pic`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            profilePicImg.src = data.profilePic;
            alert("✅ Profile picture updated!");
          } else {
            alert("❌ Failed to upload profile picture.");
          }
        } catch (err) {
          console.error("Error uploading profile picture:", err);
        }
      });
    }
  }

  // Redirect to login
  const loginBtn = document.querySelector(".login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "login.html";
    });
  }

  // Feedback menu redirection
  const feedbackOption = document.querySelector(".feedback-option");
  if (feedbackOption) {
    feedbackOption.addEventListener("click", () => {
      window.location.href = "feedback.html";
    });
  }

  // Feedback form submission and validation
  const form = document.querySelector(".feedback-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const type = form.type.value;  // Must match schema
      const message = form.message.value.trim();

      if (!name || !email || !type || !message) {
        alert("Please fill in all fields correctly.");
        return;
      }

      if (!validateEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, type, message }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert("Error submitting feedback: " + (data.error || "Unknown error"));
          return;
        }

        alert("Thank you for your feedback, " + name + "!");
        form.reset();
      } catch (err) {
        console.error("Feedback submit error:", err);
        alert("Failed to send feedback. Try again later.");
      }
    });
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }


  // redirect from  back button  to required html page 
  const backBtn = document.querySelector(".back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const path = window.location.pathname.toLowerCase();

      if (path.includes("resetpass.html") || path.includes("forgotpass.html")) {
        window.location.href = "login.html"; // ✅ Go to login from reset/forgot
      } else if (path.includes("feedback.html")) {
        window.location.href = "updMain.html"; // ✅ Back from feedback
      } else {
        window.location.href = "login.html"; // fallback
      }
    });
  }


  const goBackBtn = document.getElementById("goBackBtn");
  if (goBackBtn) {
    goBackBtn.addEventListener("click", function () {
      window.location.href = "updMain.html";
    });
  }

  const loginButtonHelp = document.querySelector(".login-button");
  if (loginButtonHelp) {
    loginButtonHelp.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }

  const loginButtonPrivacy = document.querySelector(".login-button");
  if (loginButtonPrivacy) {
    loginButtonPrivacy.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }

  const loginBtnContact = document.querySelector(".login-btn");
  if (loginBtnContact) {
    loginBtnContact.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }
});

// Redirect from term to login
function redirectToLogin() {
  window.location.href = "login.html";
}