// announcements.js
// Requires firebase-config.js (provides `database`) and SweetAlert2

document.addEventListener("DOMContentLoaded", () => {
  const announcementsRef = database.ref("announcements");

  // UI Elements
  const announcementsList = document.getElementById("announcements-container");
  const searchInput = document.getElementById("announcement-search");
  const priorityFilter = document.getElementById("priority-filter");
  const dateFilter = document.getElementById("date-filter");
  const loadMoreBtn = document.getElementById("load-more-btn");

  // Pagination control
  const PAGE_SIZE = 5;
  let allAnnouncements = [];
  let visibleAnnouncements = 0;

  // Assume we know user role from authUser (set in localStorage)
  const authUser = JSON.parse(localStorage.getItem("authUser")) || {};
  const userRole = authUser.role || "member";

  // Fetch announcements from Firebase
  // Fetch announcements from Firebase
  announcementsRef.on("value", (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      allAnnouncements = Object.keys(data)
        .map((id) => ({ id, ...data[id] }))
        .filter((a) => {
          // Only show if audience is "members_only" or "all_users"
          return a.audience === "members_only" || a.audience === "all_users";
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      visibleAnnouncements = 0;
      announcementsList.innerHTML = "";
      loadMoreAnnouncements();
    } else {
      announcementsList.innerHTML = `<p>No announcements available.</p>`;
    }
  });

  // Render announcement item (no action buttons)
  function createAnnouncementItem(announcement) {
    const item = document.createElement("div");
    item.classList.add("announcement-item");
    item.dataset.category = announcement.category || "general";
    item.dataset.priority = announcement.priority || "low";

    item.innerHTML = `
      <div class="announcement-header">
        <div class="priority-indicator ${announcement.priority || "low"}-priority"></div>
        <h4>${announcement.title}</h4>
        <span class="announcement-date">${new Date(
          announcement.date
        ).toLocaleString()}</span>
      </div>
      <div class="announcement-content">
        <p>${announcement.content}</p>
      </div>
    `;

    return item;
  }

  // Load more announcements
  function loadMoreAnnouncements() {
    const nextAnnouncements = allAnnouncements.slice(
      visibleAnnouncements,
      visibleAnnouncements + PAGE_SIZE
    );
    nextAnnouncements.forEach((a) =>
      announcementsList.appendChild(createAnnouncementItem(a))
    );
    visibleAnnouncements += PAGE_SIZE;

    if (visibleAnnouncements >= allAnnouncements.length) {
      loadMoreBtn.style.display = "none";
    } else {
      loadMoreBtn.style.display = "block";
    }
  }

  loadMoreBtn.addEventListener("click", loadMoreAnnouncements);

  // Filters
  function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const priority = priorityFilter.value;
    const dateOption = dateFilter.value;

    const now = new Date();

    announcementsList.innerHTML = "";
    allAnnouncements.forEach((a) => {
      let matches = true;

      if (
        search &&
        !a.title.toLowerCase().includes(search) &&
        !a.content.toLowerCase().includes(search)
      ) {
        matches = false;
      }

      if (priority !== "all" && a.priority !== priority) {
        matches = false;
      }

      if (dateOption !== "all") {
        const aDate = new Date(a.date);
        if (dateOption === "today") {
          matches =
            aDate.toDateString() === now.toDateString() ? matches : false;
        } else if (dateOption === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matches = aDate >= weekAgo ? matches : false;
        } else if (dateOption === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matches = aDate >= monthAgo ? matches : false;
        }
      }

      if (matches) {
        announcementsList.appendChild(createAnnouncementItem(a));
      }
    });
  }

  searchInput.addEventListener("input", applyFilters);
  priorityFilter.addEventListener("change", applyFilters);
  dateFilter.addEventListener("change", applyFilters);
});
