document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.querySelector('.logout-btn');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');

    // Load user data from sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('authUser')) || {};
    const currentUser = { ...userData };

    if (nameEl) nameEl.textContent = currentUser.name || 'User';
    if (roleEl) roleEl.textContent = currentUser.role
        ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
        : 'Staff';

    // Sidebar toggle and responsive
    function checkScreenSize() {
        if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-collapsed');
            if (sidebarToggle) sidebarToggle.style.display = 'flex';
            updateToggleIcon();
        } else {
            sidebar.classList.remove('mobile-collapsed');
            if (sidebarToggle) sidebarToggle.style.display = 'none';
        }
    }

    function updateToggleIcon() {
        if (window.innerWidth <= 1024) {
            sidebarToggle.innerHTML = sidebar.classList.contains('mobile-collapsed')
                ? '<i class="fas fa-times"></i>'
                : '<i class="fas fa-bars"></i>';
        }
    }

    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-collapsed');
            updateToggleIcon();
        });
    }

    // Click outside to close sidebar on mobile
    document.addEventListener('click', (e) => {
        if (
            window.innerWidth <= 1024 &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target) &&
            sidebar.classList.contains('mobile-collapsed')
        ) {
            sidebar.classList.remove('mobile-collapsed');
            updateToggleIcon();
        }
    });

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: 'Logout Confirmation',
                text: 'Are you sure you want to logout?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, logout!',
                cancelButtonText: 'Cancel',
                background: '#2c3e50',
                color: '#fff',
                iconColor: '#ffcc00'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Logging out...',
                        text: 'Please wait while we securely log you out.',
                        icon: 'info',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        background: '#2c3e50',
                        color: '#fff'
                    });

                    localStorage.clear();
                    sessionStorage.clear();

                    if (typeof auth !== 'undefined' && auth) {
                        auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
                            .then(() => auth.signOut())
                            .then(() => showLogoutSuccess())
                            .catch(() => showLogoutSuccess());
                    } else {
                        showLogoutSuccess();
                    }
                }
            });
        });
    }

    function showLogoutSuccess() {
        Swal.close();
        Swal.fire({
            title: 'Logged Out!',
            text: 'You have been successfully logged out. Redirecting...',
            icon: 'success',
            confirmButtonColor: '#3085d6',
            background: '#2c3e50',
            color: '#fff',
            iconColor: '#4caf50',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        setTimeout(() => {
            window.location.href = '../index.html?logout=' + Date.now();
        }, 2000);
    }

    // ================= Notifications =================
    const notifBtn = document.getElementById("notification-btn");
    const notifDropdown = document.getElementById("notifications-dropdown");
    const notifList = document.getElementById("notifications-list");
    const notifTabs = document.querySelectorAll(".notif-tab");

    const badge = document.createElement("span");
    badge.classList.add("badge");
    notifBtn?.appendChild(badge);

    let allNotifications = [];
    let canSeeRegistration = currentUser.canVerifyUsers === true;

    function isStaff(user) { return user.role === "staff"; }

    function canAccessUserManagement(user) {
        return isStaff(user) && user.canVerifyUsers;
    }

    function markAsRead(activityId) {
        if (!currentUser || !activityId) return;
        database.ref(`activity_table/${activityId}/readBy/${currentUser.uid}`).set(true);
    }

    function resetBadge() {
        badge.textContent = "";
        badge.style.display = "none";
    }

    function renderNotifications(filter = "all") {
        notifList.innerHTML = "";

        let filtered = [...allNotifications];
        if (filter === "unread") {
            filtered = filtered.filter(n => !n.readBy || !n.readBy[currentUser.uid]);
        }

        filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filtered.length === 0) {
            notifList.innerHTML = `<p class="no-notifs">No notifications</p>`;
            resetBadge();
            return;
        }

        filtered.forEach(n => {
            switch(n.type){
                case "registration":
                    if (canAccessUserManagement(currentUser)) renderRegistrationNotif(n);
                    break;
                case "resource_upload":
                    renderResourceNotif(n);
                    break;
                case "announcement":
                    renderAnnouncementNotif(n);
                    break;
                case "schedule":
                    renderScheduleNotif(n);
                    break;
            }
        });

        const unreadCount = allNotifications.filter(n => !n.readBy || !n.readBy[currentUser.uid]).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = "inline-block";
        } else resetBadge();
    }

    function loadNotifications() {
        database.ref("activity_table").on("value", snapshot => {
            const data = snapshot.val() || {};
            allNotifications = Object.entries(data).map(([id, notif]) => ({ id, ...notif }));
            renderNotifications("all");
        });
    }

    // Notification dropdown toggle
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener("click", e => {
            e.stopPropagation();
            notifDropdown.style.display =
                notifDropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", e => {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.style.display = "none";
            }
        });
    }

    // Tab switching
    notifTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            notifTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            renderNotifications(tab.dataset.tab);
        });
    });

    // ---------------- Specific renderers ----------------
    function renderRegistrationNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.id = `notif-${data.id}`;
        notifItem.innerHTML = `
            <div class="notif-avatar">${data.name.charAt(0).toUpperCase()}</div>
            <div class="notif-content">
                <strong>${data.name}</strong><br>
                <small>${data.email}</small><br>
                <small>${new Date(data.createdAt).toLocaleString()}</small>
            </div>
        `;
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "user-management.html";
        });
        notifList.prepend(notifItem);
    }

    function renderResourceNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        let canView = isStaff(currentUser) ? ["public","staff"].includes(data.accessLevel) : false;
        if (!canView) return;

        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `
            <div class="notif-avatar">📘</div>
            <div class="notif-content">
                <strong>New Resource Uploaded</strong><br>
                <small>${data.resourceName || "Unnamed Resource"}</small><br>
                <small>Uploaded by ${data.uploadedBy}</small><br>
                <small>Access: ${data.accessLevel || "public"}</small>
            </div>
        `;
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "resources.html";
        });
        notifList.prepend(notifItem);
    }

    function renderAnnouncementNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `
            <div class="notif-avatar">📢</div>
            <div class="notif-content">
                <strong>${data.title}</strong><br>
                <small>${new Date(data.date).toLocaleString()}</small>
            </div>
        `;
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "announcements.html";
        });
        notifList.prepend(notifItem);
    }

    function renderScheduleNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `
            <div class="notif-avatar">📅</div>
            <div class="notif-content">
                <strong>${data.title}</strong><br>
                <small>Type: ${data.scheduleType || "General"}</small><br>
                <small>Start: ${new Date(data.start).toLocaleString()}</small><br>
                <small>End: ${data.end ? new Date(data.end).toLocaleString() : "N/A"}</small>
            </div>
        `;
        notifItem.addEventListener("click", () => {
            markAsRead(data.id);
            window.location.href = "schedules.html";
        });
        notifList.prepend(notifItem);
    }

    // Start loading notifications
    loadNotifications();
});
