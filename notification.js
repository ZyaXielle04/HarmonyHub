// ===================== ADMIN GENERAL NOTIFICATIONS =====================
document.addEventListener("DOMContentLoaded", () => {
    const notifBtn = document.getElementById("notification-btn");
    const notifDropdown = document.getElementById("notifications-dropdown");
    const notifList = document.getElementById("notifications-list");
    const notifTabs = document.querySelectorAll(".notif-tab");

    // Badge element
    const badge = document.createElement("span");
    badge.classList.add("badge");
    notifBtn.appendChild(badge);

    // Globals
    let currentUser = null;
    let canSeeRegistration = false;
    let allNotifications = [];

    // ================= ROLE & PERMISSION HELPERS =================
    function isAdmin(user) {
        return user?.role === "admin";
    }

    function isStaff(user) {
        return user?.role === "staff";
    }

    function isMember(user) {
        return user?.role === "member";
    }

    function hasPermission(user, permissionKey) {
        return !!user?.permissions?.[permissionKey];
    }

    function canAccessUserManagement(user) {
        return (isAdmin(user) || isStaff(user)) && hasPermission(user, "canVerifyUsers");
    }

    // ================= AUTH + PERMISSION CHECK =================
    auth.onAuthStateChanged((user) => {
        if (!user) return;

        database.ref(`users/${user.uid}`).once("value").then((snap) => {
            const userData = snap.val();
            if (!userData) return;

            currentUser = { uid: user.uid, ...userData };

            // Only admins or staff with canVerifyUsers see registration notifs
            canSeeRegistration = canAccessUserManagement(currentUser);

            // Load notifications
            loadNotifications();
        });
    });

    // ================= LOAD NOTIFICATIONS =================
    function loadNotifications() {
        database.ref("activity_table").on("value", (snapshot) => {
            const data = snapshot.val() || {};
            allNotifications = Object.entries(data).map(([id, notif]) => ({
                id,
                ...notif,
            }));

            // Default render: all
            renderNotifications("all");
        });
    }

    // ================= RENDER NOTIFICATIONS =================
    function renderNotifications(filter = "all") {
        notifList.innerHTML = "";

        let filtered = [...allNotifications];

        if (filter === "unread") {
            filtered = filtered.filter(
                (n) => !n.readBy || !n.readBy[currentUser.uid]
            );
        }

        // Sort newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filtered.length === 0) {
            notifList.innerHTML = `<p class="no-notifs">No notifications</p>`;
            resetBadge();
            return;
        }

        // Render by type
        filtered.forEach((notif) => {
            switch (notif.type) {
                case "registration":
                    if (canSeeRegistration) {
                        renderRegistrationNotif(notif);
                    }
                    break;
                case "resource_upload":
                    renderResourceNotif(notif);
                    break;
                case "announcement":
                    renderAnnouncementNotif(notif);
                    break;
                case "schedule":
                    renderScheduleNotif(notif);
                    break;
                default:
                    console.warn("Unknown notif type:", notif);
            }
        });

        // Badge update
        const unreadCount = allNotifications.filter(
            (n) => !n.readBy || !n.readBy[currentUser.uid]
        ).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = "inline-block";
        } else {
            resetBadge();
        }
    }

    // ================= REGISTRATION NOTIFICATION =================
    function renderRegistrationNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        let actionsHtml = "";
        if (!data.solved) {
            actionsHtml = `
                <div class="notif-actions">
                    <button class="notif-approve">Verify Account</button>
                </div>
            `;
        } else {
            if (data.verifiedBy) {
                actionsHtml = `<div class="notif-status">✅ Verified by ${data.verifiedBy} on ${new Date(data.verificationDate).toLocaleString()}</div>`;
            } else {
                actionsHtml = `<div class="notif-status">✔️ Solved</div>`;
            }
        }

        notifItem.innerHTML = `
            <div class="notif-avatar">${data.name.charAt(0).toUpperCase()}</div>
            <div class="notif-content">
                <strong>${data.name}</strong>
                <small>${data.email}</small><br>
                <small>${new Date(data.createdAt).toLocaleString()}</small>
                ${actionsHtml}
            </div>
        `;

        // 📌 Redirect to user-management.html
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "user-management.html";
        });

        if (!data.solved) {
            notifItem.querySelector(".notif-approve").addEventListener("click", (e) => {
                e.stopPropagation(); // prevent redirect
                const verificationDate = new Date().toISOString();

                database.ref(`users/${data.userId}`).update({
                    isVerified: true,
                    verificationDate: verificationDate
                });

                database.ref(`activity_table/${data.id}`).update({
                    isVerified: true,
                    verifiedBy: currentUser.name,
                    verificationDate: verificationDate,
                    solved: true,
                });

                database.ref(`activity_table/${data.id}/readBy/${currentUser.uid}`).set(true);

                Swal.fire("✅ Verified", `${data.name} is now verified.`, "success");
            });
        }

        notifList.prepend(notifItem);
    }

    // ================= RESOURCE UPLOAD NOTIFICATION =================
    function renderResourceNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const access = data.accessLevel || "public";

        let canView = false;
        if (isAdmin(currentUser)) {
            canView = true;
        } else if (isStaff(currentUser)) {
            canView = access === "public" || access === "staff";
        } else if (isMember(currentUser)) {
            canView = access === "public" || access === "members";
        }

        if (!canView) return;

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        // Lookup uploader name
        database.ref(`users/${data.uploadedBy}/name`).once("value").then((snap) => {
            const uploaderName = snap.val() || "Unknown User";

            notifItem.innerHTML = `
                <div class="notif-avatar">📘</div>
                <div class="notif-content">
                    <strong>New Resource Uploaded</strong><br>
                    <small>📄 ${data.resourceName || "Unnamed Resource"}</small><br>
                    <small>👤 Uploaded by ${uploaderName}</small><br>
                    <small>🔑 Access: ${access}</small><br>
                    <small>🕒 ${new Date(data.timestamp).toLocaleString()}</small>
                </div>
            `;

            // 📌 Redirect to resources.html
            notifItem.addEventListener("click", () => {
                markAsRead(data.id);
                window.location.href = "resources.html";
            });

            notifList.prepend(notifItem);
        });
    }

    // ================= ANNOUNCEMENT NOTIFICATION =================
    function renderAnnouncementNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        notifItem.innerHTML = `
            <div class="notif-avatar">📢</div>
            <div class="notif-content">
                <strong>Announcement:</strong> ${data.title}<br>
                <small>${new Date(data.date).toLocaleString()}</small>
            </div>
        `;

        // 📌 Redirect to announcement.html
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "announcements.html";
        });

        notifList.prepend(notifItem);
    }

    // ================= SCHEDULE NOTIFICATION (NEW with colors/icons) =================
    function renderScheduleNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];

        // Pick icon + color by scheduleType
        let icon = "📅";
        let color = "#6c5ce7"; // default purple

        switch ((data.scheduleType || "").toLowerCase()) {
            case "meeting":
                icon = "📘";
                color = "#0984e3"; // blue
                break;
            case "performance":
                icon = "📅";
                color = "#00b894"; // green
                break;
            case "activity":
                icon = "📝";
                color = "#e17055"; // orange
                break;
        }

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        notifItem.innerHTML = `
            <div class="notif-avatar" style="background:${color};">${icon}</div>
            <div class="notif-content">
                <strong>${data.title}</strong><br>
                <small>📌 Type: ${data.scheduleType || "General"}</small><br>
                <small>🕒 Start: ${new Date(data.start).toLocaleString()}</small><br>
                <small>🕒 End: ${data.end ? new Date(data.end).toLocaleString() : "N/A"}</small>
            </div>
        `;

        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "schedules.html";
        });

        notifList.prepend(notifItem);
    }

    // ================= READ-BY LOGIC =================
    function markAsRead(activityId) {
        if (!currentUser) return;
        const path = `activity_table/${activityId}/readBy/${currentUser.uid}`;
        database.ref(path).set(true);
    }

    // ================= BADGE HANDLING =================
    function resetBadge() {
        badge.textContent = "";
        badge.style.display = "none";
    }

    // ================= TAB SWITCHING =================
    notifTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            notifTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            renderNotifications(tab.dataset.tab);
        });
    });

    // ================= DROPDOWN TOGGLE =================
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notifDropdown.style.display =
                notifDropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (
                !notifDropdown.contains(e.target) &&
                !notifBtn.contains(e.target)
            ) {
                notifDropdown.style.display = "none";
            }
        });
    }
});
