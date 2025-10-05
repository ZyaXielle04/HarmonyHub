// /admin/js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.database();

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    const snapshot = await db.ref(`users/${user.uid}`).once("value");
    const data = snapshot.val();

    if (!data) {
      Swal.fire("Unauthorized", "User data not found!", "error");
      setTimeout(() => window.location.href = "../index.html", 2000);
      return;
    }

    const role = data.role || "member";
    const displayName = data.displayName || "User";

    // --- Update Sidebar User Info ---
    const avatarEl = document.querySelector(".user-avatar");
    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");

    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // --- Update Stats Cards ---
    try {
      const usersSnap = await db.ref("users").once("value");
      const totalUsers = usersSnap.numChildren();

      const schedulesSnap = await db.ref("schedules").once("value");
      const totalSchedulesToday = Object.values(schedulesSnap.val() || {}).filter(s => {
        const scheduleDate = new Date(s.date);
        const today = new Date();
        return scheduleDate.toDateString() === today.toDateString();
      }).length;

      const resourcesSnap = await db.ref("resources").once("value");
      const totalResources = resourcesSnap.numChildren();

      const meetingsSnap = await db.ref("meetings").once("value");
      const liveMeetings = Object.values(meetingsSnap.val() || {}).filter(m => m.status === "live").length;

      const statsMap = {
        ".stat-card:nth-child(1) .stat-value": totalUsers,
        ".stat-card:nth-child(2) .stat-value": totalSchedulesToday,
        ".stat-card:nth-child(3) .stat-value": totalResources,
        ".stat-card:nth-child(4) .stat-value": liveMeetings
      };

      Object.keys(statsMap).forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.textContent = statsMap[selector];
      });

    } catch (err) {
      console.error("Error fetching stats:", err);
    }

    // --- Load Upcoming Schedules ---
    const schedulesContainer = document.querySelector(".schedules-container");
    if (schedulesContainer) {
      schedulesContainer.innerHTML = ""; // Clear existing

      const schedulesData = await db.ref("schedules").once("value");
      const schedules = Object.values(schedulesData.val() || {}).sort((a, b) => new Date(a.date) - new Date(b.date));

      schedules.forEach(schedule => {
        const card = document.createElement("div");
        card.className = "schedule-card";
        if (schedule.urgent) card.classList.add("urgent");

        card.innerHTML = `
          <div class="schedule-header">
            <h3 class="schedule-title">${schedule.title}</h3>
            <span class="schedule-time">${schedule.time}</span>
          </div>
          <div class="schedule-details">
            <div class="schedule-detail"><span>👤</span> Facilitator: ${schedule.facilitator}</div>
            <div class="schedule-detail"><span>📍</span> ${schedule.location}</div>
            <div class="schedule-detail"><span>👥</span> ${schedule.participants} participants</div>
          </div>
          <div class="schedule-actions">
            <button class="schedule-btn primary">View Details</button>
            <button class="schedule-btn secondary">Action</button>
          </div>
        `;
        schedulesContainer.appendChild(card);
      });
    }

    // --- Load Recent Activity ---
    const activityList = document.querySelector(".activity-list");
    if (activityList) {
      activityList.innerHTML = ""; // Clear existing
      const activitySnap = await db.ref("activity").limitToLast(10).once("value");
      const activities = Object.values(activitySnap.val() || {}).reverse();

      activities.forEach(act => {
        const li = document.createElement("li");
        li.className = "activity-item";

        li.innerHTML = `
          <div class="activity-icon">${act.icon || "ℹ️"}</div>
          <div class="activity-content">
            <h4 class="activity-title">${act.title}</h4>
            <p class="activity-details">${act.details}</p>
            <p class="activity-time">${act.time}</p>
          </div>
        `;
        activityList.appendChild(li);
      });
    }

    // --- Sidebar Toggle for mobile ---
    const sidebarToggle = document.querySelector(".sidebar-toggle");
    const sidebar = document.querySelector(".sidebar");
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-collapsed");
      });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        auth.signOut().then(() => window.location.href = "../index.html");
      });
    }
  });
});
