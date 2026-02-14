document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherUsernameInput = document.getElementById("teacher-username");
  const teacherPasswordInput = document.getElementById("teacher-password");
  const teacherLoginBtn = document.getElementById("teacher-login-btn");
  const teacherLogoutBtn = document.getElementById("teacher-logout-btn");
  const teacherStatus = document.getElementById("teacher-status");

  let teacherAuthHeader = null;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateTeacherUI(authenticated, username = "") {
    if (authenticated) {
      teacherStatus.textContent = `Teacher mode is on (${username}). You can unregister students.`;
      teacherLoginBtn.classList.add("hidden");
      teacherLogoutBtn.classList.remove("hidden");
      teacherUsernameInput.disabled = true;
      teacherPasswordInput.disabled = true;
    } else {
      teacherStatus.textContent = "Teacher mode is off. Unregister is restricted.";
      teacherLoginBtn.classList.remove("hidden");
      teacherLogoutBtn.classList.add("hidden");
      teacherUsernameInput.disabled = false;
      teacherPasswordInput.disabled = false;
    }
  }

  function getAuthHeaders() {
    return teacherAuthHeader ? { Authorization: teacherAuthHeader } : {};
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacherAuthHeader
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!teacherAuthHeader) {
      showMessage("Only authenticated teachers can unregister students.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Confirm unregister ${email} from ${activity}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  teacherLoginBtn.addEventListener("click", async () => {
    const username = teacherUsernameInput.value.trim();
    const password = teacherPasswordInput.value;

    if (!username || !password) {
      showMessage("Enter teacher username and password.", "error");
      return;
    }

    const encoded = btoa(`${username}:${password}`);
    const authHeader = `Basic ${encoded}`;

    try {
      const response = await fetch("/auth/teacher", {
        headers: {
          Authorization: authHeader,
        },
      });

      const result = await response.json();

      if (response.ok) {
        teacherAuthHeader = authHeader;
        updateTeacherUI(true, username);
        teacherPasswordInput.value = "";
        showMessage(result.message || "Teacher authenticated.", "success");
        fetchActivities();
      } else {
        teacherAuthHeader = null;
        updateTeacherUI(false);
        showMessage(result.detail || "Teacher authentication failed.", "error");
      }
    } catch (error) {
      teacherAuthHeader = null;
      updateTeacherUI(false);
      showMessage("Failed to verify teacher credentials.", "error");
      console.error("Error during teacher login:", error);
    }
  });

  teacherLogoutBtn.addEventListener("click", () => {
    teacherAuthHeader = null;
    teacherUsernameInput.value = "";
    teacherPasswordInput.value = "";
    updateTeacherUI(false);
    showMessage("Teacher mode turned off.", "info");
    fetchActivities();
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateTeacherUI(false);
  fetchActivities();
});
