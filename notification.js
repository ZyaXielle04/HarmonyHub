// ===================== ADMIN GENERAL NOTIFICATIONS =====================
document.addEventListener("DOMContentLoaded", () => {
    const notifBtn = document.getElementById("notification-btn");
    const notifDropdown = document.getElementById("notifications-dropdown");
    const notifList = document.getElementById("notifications-list");
    const notifTabs = document.querySelectorAll(".notif-tab");

    // Badge element (red dot)
    const badge = document.createElement("span");
    badge.classList.add("badge");
    badge.style.width = "10px";
    badge.style.height = "10px";
    badge.style.borderRadius = "50%";
    badge.style.backgroundColor = "red";
    badge.style.display = "none"; // hidden by default
    notifBtn.appendChild(badge);

    // Globals
    let currentUser = null;
    let canSeeRegistration = false;
    let allNotifications = [];

    // ================= ROLE & PERMISSION HELPERS =================
    function isAdmin(user) { return user?.role === "admin"; }
    function isStaff(user) { return user?.role === "staff"; }
    function isMember(user) { return user?.role === "member"; }
    function hasPermission(user, key) { return !!user?.permissions?.[key]; }
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
            canSeeRegistration = canAccessUserManagement(currentUser);

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
                // 🔥 Ensure every notification has a unified timestamp for sorting
                timestamp: notif.timestamp 
                    ? notif.timestamp 
                    : (notif.createdAt 
                        ? new Date(notif.createdAt).getTime() 
                        : (notif.date ? new Date(notif.date).getTime() : 0))
            }));

            renderNotifications("all");
        });
    }

    // ================= RENDER NOTIFICATIONS =================
    function renderNotifications(filter = "all") {
        notifList.innerHTML = "";
        let filtered = [...allNotifications];

        if (filter === "unread") {
            filtered = filtered.filter(n => !n.readBy || !n.readBy[currentUser.uid]);
        }

        // 🔥 Sort newest → oldest by timestamp (unified)
        filtered.sort((a, b) => b.timestamp - a.timestamp);

        if (filtered.length === 0) {
            notifList.innerHTML = `<p class="no-notifs">No notifications</p>`;
            resetBadge();
            return;
        }

        filtered.forEach((notif) => {
            switch (notif.type) {
                case "registration":
                    if (canSeeRegistration) renderRegistrationNotif(notif);
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
                case "meeting":
                    renderMeetingNotif(notif);
                    break;
                default:
                    console.warn("Unknown notif type:", notif);
            }
        });

        updateBadge();
    }

    // ================= REGISTRATION NOTIFICATION =================
    function renderRegistrationNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        let actionsHtml = "";

        // 🔥 If user was deleted (has deletedBy field)
        if (data.deletedBy) {
            // Try to fetch the name of the one who deleted the user
            database.ref(`users/${data.deletedBy}/name`).once("value").then((snap) => {
                const deleterName = snap.val() || "Unknown Admin";

                notifItem.innerHTML = `
                    <div class="notif-avatar">${data.name?.charAt(0).toUpperCase() || "U"}</div>
                    <div class="notif-content">
                        <strong>${data.name || "Unnamed User"}</strong><br>
                        <small>${data.email || "No email"}</small><br>
                        <small>${new Date(data.timestamp).toLocaleString()}</small><br>
                        <div class="notif-status" style="color:red;">❌ Deleted by: ${deleterName}</div>
                    </div>
                `;
            });
        }
        else {
            // Normal verified / unverified logic
            if (!data.solved) {
                actionsHtml = `<div class="notif-actions"><button class="notif-approve">Verify Account</button></div>`;
            } else {
                actionsHtml = data.verifiedBy
                    ? `<div class="notif-status">✅ Verified by ${data.verifiedBy} on ${new Date(data.verificationDate).toLocaleString()}</div>`
                    : `<div class="notif-status">✔️ Solved</div>`;
            }

            notifItem.innerHTML = `
                <div class="notif-avatar">${data.name?.charAt(0).toUpperCase() || "U"}</div>
                <div class="notif-content">
                    <strong>${data.name || "Unnamed User"}</strong><br>
                    <small>${data.email || "No email"}</small><br>
                    <small>${new Date(data.timestamp).toLocaleString()}</small>
                    ${actionsHtml}
                </div>
            `;

            notifItem.addEventListener("click", () => {
                markAsRead(data.id);
                window.location.href = "user-management.html";
            });

            if (!data.solved) {
                notifItem.querySelector(".notif-approve").addEventListener("click", (e) => {
                    e.stopPropagation();
                    const verificationDate = new Date().toISOString();

                    database.ref(`users/${data.userId}`).update({ isVerified: true, verificationDate });
                    database.ref(`activity_table/${data.id}`).update({
                        isVerified: true,
                        verifiedBy: currentUser.name,
                        verificationDate,
                        solved: true
                    });
                    database.ref(`activity_table/${data.id}/readBy/${currentUser.uid}`).set(true);

                    Swal.fire("✅ Verified", `${data.name} is now verified.`, "success");
                });
            }
        }

        notifList.prepend(notifItem);
    }

    // ================= RESOURCE NOTIFICATION =================
    function renderResourceNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const access = data.accessLevel || "public";
        if (!canViewResource(data)) return;

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

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
                <small>${new Date(data.timestamp).toLocaleString()}</small>
            </div>
        `;

        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "announcements.html";
        });

        notifList.prepend(notifItem);
    }

    // ================= SCHEDULE NOTIFICATION =================
    function renderScheduleNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        let icon = "📅", color = "#6c5ce7";

        switch ((data.scheduleType || "").toLowerCase()) {
            case "meeting": icon = "📘"; color = "#0984e3"; break;
            case "performance": icon = "📅"; color = "#00b894"; break;
            case "activity": icon = "📝"; color = "#e17055"; break;
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

    // ================= MEETING NOTIFICATION =================
    function renderMeetingNotif(data) {
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;

        notifItem.innerHTML = `
            <div class="notif-avatar">📘</div>
            <div class="notif-content">
                <strong>Meeting Scheduled</strong><br>
                <small>Meeting ID: ${data.meetingId}</small><br>
                <small>Passcode: ${data.passcode}</small><br>
                <small>Date: ${data.date}</small><br>
                <small>Time: ${data.time}</small><br>
                <small>Created by: ${data.createdBy}</small><br>
                <button class="join-meeting-btn">Join Meeting</button>
            </div>
        `;

        notifItem.querySelector(".join-meeting-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            window.open(`https://zoom.us/j/${data.meetingId}?pwd=${data.passcode}`, "_blank");
        });

        notifItem.addEventListener("click", () => markAsRead(data.id));

        notifList.prepend(notifItem);
    }

    // ================= READ-BY LOGIC =================
    function markAsRead(activityId) {
        if (!currentUser) return;
        database.ref(`activity_table/${activityId}/readBy/${currentUser.uid}`).set(true);
        updateBadge();
    }

    // ================= BADGE HANDLING =================
    function updateBadge() {
        if (!currentUser) return;
        const visibleUnreadCount = allNotifications.filter(n => {
            const canSee =
                (n.type === "registration" && canSeeRegistration) ||
                (n.type === "resource_upload" && canViewResource(n)) ||
                (n.type === "announcement") ||
                (n.type === "schedule") ||
                (n.type === "meeting");
            return canSee && (!n.readBy || !n.readBy[currentUser.uid]);
        }).length;
        badge.style.display = visibleUnreadCount > 0 ? "inline-block" : "none";
    }

    function canViewResource(data) {
        const access = data.accessLevel || "public";
        return isAdmin(currentUser) ||
            (isStaff(currentUser) && (access === "public" || access === "staff")) ||
            (isMember(currentUser) && (access === "public" || access === "members"));
    }

    function resetBadge() { badge.style.display = "none"; }

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
            notifDropdown.style.display = notifDropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.style.display = "none";
            }
        });
    }
});
