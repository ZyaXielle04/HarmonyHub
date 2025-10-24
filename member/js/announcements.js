// announcements.js
// Requires firebase-config.js (provides `database`) and SweetAlert2

document.addEventListener("DOMContentLoaded", () => {
  const announcementsRef = database.ref("announcements");

  // UI Elements
  const announcementsList = document.getElementById("announcements-container");
  const searchInput = document.getElementById("announcement-search");
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
  announcementsRef.on("value", (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      allAnnouncements = Object.keys(data)
        .map((id) => ({ id, ...data[id] }))
        .filter((a) => {
          // ✅ Only show if NOT draft and correct audience
          const isVisibleAudience =
            a.audience === "members_only" || a.audience === "all_users";
          const isPublished = a.status !== "draft";
          return isVisibleAudience && isPublished;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      visibleAnnouncements = 0;
      announcementsList.innerHTML = "";
      loadMoreAnnouncements();
    } else {
      announcementsList.innerHTML = `<p>No announcements available.</p>`;
    }
  });

  // Render announcement item
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

  // Filters (search + date)
  function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const dateOption = dateFilter.value;
    const now = new Date();

    announcementsList.innerHTML = "";

    const filtered = allAnnouncements.filter((a) => {
      let matches = true;

      // Search match
      if (
        search &&
        !a.title.toLowerCase().includes(search) &&
        !a.content.toLowerCase().includes(search)
      ) {
        matches = false;
      }

      // Date filter match
      if (dateOption !== "all") {
        const aDate = new Date(a.date);
        if (dateOption === "today") {
          matches = aDate.toDateString() === now.toDateString();
        } else if (dateOption === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matches = aDate >= weekAgo;
        } else if (dateOption === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matches = aDate >= monthAgo;
        }
      }

      return matches;
    });

    if (filtered.length === 0) {
      announcementsList.innerHTML = `<p>No matching announcements found.</p>`;
      loadMoreBtn.style.display = "none";
      return;
    }

    filtered.slice(0, PAGE_SIZE).forEach((a) => {
      announcementsList.appendChild(createAnnouncementItem(a));
    });

    loadMoreBtn.style.display =
      filtered.length > PAGE_SIZE ? "block" : "none";
  }

  // Event listeners for filters
  searchInput.addEventListener("input", applyFilters);
  dateFilter.addEventListener("change", applyFilters);
});
