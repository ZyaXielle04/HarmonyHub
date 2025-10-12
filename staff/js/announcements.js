// ================================
// Staff Announcements Page Script
// Requires: Firebase Auth + Database + SweetAlert2
// Permission required: /canAnnounce = true
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const database = firebase.database();

  // ---------- ELEMENT REFERENCES ----------
  const cardsContainer = document.querySelector(".cards-container");
  const searchInput = document.getElementById("announcement-search");
  const filterSelect = document.getElementById("status-filter");
  const loadingIndicator = document.querySelector(".loading-indicator");
  const noDataMessage = document.querySelector(".no-data-message");

  const modal = document.getElementById("announcement-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm = document.getElementById("announcement-form");
  const closeModalBtn = document.querySelector(".close-modal");

  const titleField = document.getElementById("announcement-title");
  const contentField = document.getElementById("announcement-content");
  const audienceField = document.getElementById("announcement-audience");
  const statusField = document.getElementById("announcement-status");
  const previewContent = document.getElementById("preview-content");
  const previewText = document.querySelector(".preview-text");

  const createBtn = document.getElementById("create-announcement-btn");
  const previewBtn = document.getElementById("preview-btn");

  const announcementsRef = database.ref("announcements");

  let editingId = null;
  let canAnnounce = false;

  // ---------- AUTH & PERMISSION CHECK ----------
  auth.onAuthStateChanged((user) => {
    if (!user) {
      Swal.fire("Unauthorized", "Please log in first.", "error").then(() => {
        window.location.href = "../index.html";
      });
      return;
    }

    database.ref(`users/${user.uid}`).once("value")
      .then((snap) => {
        const userData = snap.val() || {};
        const role = userData.role || "member";
        canAnnounce = userData.permissions?.canAnnounce === true;

        if (role !== "staff") {
          Swal.fire("Unauthorized", "You are not authorized to access this page!", "error")
            .then(() => (window.location.href = "../index.html"));
          return;
        }

        // Hide CRUD buttons if not allowed
        if (!canAnnounce && createBtn) {
          createBtn.style.display = "none";
        }

        loadAnnouncements();
      })
      .catch((err) => {
        console.error(err);
        Swal.fire("Error", "Failed to verify your access.", "error").then(() => {
          window.location.href = "../index.html";
        });
      });
  });

  // ---------- LOAD ANNOUNCEMENTS ----------
  function loadAnnouncements() {
    loadingIndicator.style.display = "block";
    announcementsRef.orderByChild("timestamp").on("value", (snapshot) => {
      loadingIndicator.style.display = "none";
      cardsContainer.innerHTML = "";

      if (!snapshot.exists()) {
        noDataMessage.style.display = "block";
        return;
      }

      noDataMessage.style.display = "none";
      const announcements = [];

      snapshot.forEach((child) => {
        const data = child.val();
        announcements.push({ id: child.key, ...data });
      });

      // Sort latest first
      announcements.reverse();
      displayAnnouncements(announcements);
    });
  }

  // ---------- DISPLAY ANNOUNCEMENTS ----------
  function displayAnnouncements(list) {
    cardsContainer.innerHTML = "";

    list.forEach((ann) => {
      const card = document.createElement("div");
      card.classList.add("announcement-card");

      const statusClass = ann.status || "unknown";
      const date = ann.date
        ? new Date(ann.date).toLocaleString()
        : "Unknown";

      let audienceText = "All";
      switch (ann.audience) {
        case "members_only":
          audienceText = "Members Only";
          break;
        case "staff_only":
          audienceText = "Staff Only";
          break;
        case "all_users":
            audienceText = "All Users";
      }

      card.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${ann.title || "Untitled"}</h3>
          <span class="card-status ${statusClass}">${ann.status || "Unknown"}</span>
        </div>
        <div class="card-body">
          <p class="card-audience"><strong>Audience:</strong> ${audienceText}</p>
          <p class="card-date"><strong>Date:</strong> ${date}</p>
          <div class="card-message">${ann.content || ""}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm view-btn">View</button>
          ${canAnnounce ? `
            <button class="btn btn-primary btn-sm edit-btn">Edit</button>
            <button class="btn btn-danger btn-sm delete-btn">Delete</button>
          ` : ""}
        </div>
      `;

      // --- View always works ---
      card.querySelector(".view-btn").addEventListener("click", () => viewAnnouncement(ann.id));

      // --- Edit/Delete only if allowed ---
      if (canAnnounce) {
        card.querySelector(".edit-btn").addEventListener("click", () => editAnnouncement(ann.id));
        card.querySelector(".delete-btn").addEventListener("click", () => deleteAnnouncement(ann.id));
      }

      cardsContainer.appendChild(card);
    });
  }

  // ---------- CREATE / EDIT ----------
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      editingId = null;
      modalTitle.textContent = "Create Announcement";
      modalForm.reset();
      previewContent.style.display = "none";
      modal.style.display = "flex";
    });
  }

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  previewBtn.addEventListener("click", () => {
    const title = titleField.value.trim();
    const content = contentField.value.trim();
    const audience = audienceField.value;
    const status = statusField.value;

    if (!title || !content) {
      Swal.fire("Missing Info", "Please fill out all fields before previewing.", "warning");
      return;
    }

    previewContent.style.display = "block";
    previewContent.querySelector("h3").textContent = title;
    previewContent.querySelector("p.audience span").textContent = audience;
    previewContent.querySelector("p.status span").textContent = status || "Unknown";
    previewText.textContent = content;
  });

  modalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!canAnnounce) {
      Swal.fire("Unauthorized", "You don't have permission to create or edit announcements.", "error");
      return;
    }

    const title = titleField.value.trim();
    const content = contentField.value.trim();
    const audience = audienceField.value;
    const status = statusField.value;

    if (!title || !content) {
      Swal.fire("Missing Info", "Please complete all fields.", "warning");
      return;
    }

    const now = Date.now();
    const isoDate = new Date(now).toISOString();

    const data = {
      title,
      content,
      audience,
      status,
      date: isoDate,     // readable format
      timestamp: now,    // unified sorting format
    };

    try {
      if (editingId) {
        // === UPDATE EXISTING ANNOUNCEMENT ===
        await announcementsRef.child(editingId).update(data);

        // Update activity_table entry (optional if you want mirrored updates)
        const activityRef = database.ref("activity_table");
        const activitySnapshot = await activityRef
          .orderByChild("relatedId")
          .equalTo(editingId)
          .once("value");

        if (activitySnapshot.exists()) {
          activitySnapshot.forEach((child) => {
            child.ref.update({
              title: `Updated Announcement: ${title}`,
              message: content,
              timestamp: now,
            });
          });
        }

        Swal.fire("Updated!", "Announcement updated successfully.", "success");
      } else {
        // === CREATE NEW ANNOUNCEMENT ===
        const newAnnRef = await announcementsRef.push(data);

        // ✅ Log to activity_table (only for authorized announcers)
        if (canAnnounce) {
          const activityData = {
            type: "announcement",
            title: `New Announcement: ${title}`,
            message: content,
            audience,
            authorRole: "staff",
            relatedId: newAnnRef.key,
            timestamp: now,
          };

          await database.ref("activity_table").push(activityData);
        }

        Swal.fire("Created!", "Announcement created successfully.", "success");
      }

      modal.style.display = "none";
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong while saving the announcement.", "error");
    }
  });

  // ---------- VIEW / EDIT / DELETE ----------
  function viewAnnouncement(id) {
    announcementsRef.child(id).once("value").then((snap) => {
      const ann = snap.val();
      if (!ann) return;

      let audienceText = "All";
      switch (ann.audience) {
        case "members_only":
          audienceText = "Members Only";
          break;
        case "staff_only":
          audienceText = "Staff Only";
          break;
        case "all_users":
            audienceText = "All Users";
      }

      Swal.fire({
        title: ann.title,
        html: `
          <p><strong>Audience:</strong> ${audienceText || "All"}</p>
          <p><strong>Status:</strong> ${ann.status || "Unknown"}</p>
          <p><strong>Date:</strong> ${new Date(ann.date).toLocaleString()}</p>
          <hr/>
          <p style="text-align:left;">${ann.content}</p>
        `,
        width: 600,
      });
    });
  }

  function editAnnouncement(id) {
    announcementsRef.child(id).once("value").then((snap) => {
      const ann = snap.val();
      if (!ann) return;

      let audienceText = "All";
      switch (ann.audience) {
        case "members_only":
          audienceText = "Members Only";
          break;
        case "staff_only":
          audienceText = "Staff Only";
          break;
        case "all_users":
            audienceText = "All Users";
      }

      editingId = id;
      modalTitle.textContent = "Edit Announcement";
      titleField.value = ann.title;
      contentField.value = ann.content;
      audienceField.value = audienceText || "all";
      statusField.value = ann.status || "draft";
      modal.style.display = "flex";
    });
  }

  function deleteAnnouncement(id) {
    Swal.fire({
      title: "Are you sure?",
      text: "This announcement will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        announcementsRef.child(id).remove()
          .then(() => Swal.fire("Deleted!", "Announcement removed.", "success"))
          .catch(() => Swal.fire("Error", "Failed to delete announcement.", "error"));
      }
    });
  }

  // ---------- SEARCH & FILTER ----------
  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".announcement-card");

    cards.forEach((card) => {
      const title = card.querySelector(".card-title").textContent.toLowerCase();
      card.style.display = title.includes(query) ? "flex" : "none";
    });
  });

  filterSelect?.addEventListener("change", () => {
    const filter = filterSelect.value;
    const cards = document.querySelectorAll(".announcement-card");

    cards.forEach((card) => {
      const status = card.querySelector(".card-status").textContent.toLowerCase();
      card.style.display = filter === "all" || status === filter ? "flex" : "none";
    });
  });
});
