document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.querySelector('.logout-btn');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');
    const userAvatar = document.querySelector('.user-avatar');

    const userData = JSON.parse(sessionStorage.getItem('authUser')) || {};
    const currentUser = { ...userData };

    if (nameEl) nameEl.textContent = currentUser.name || 'User';
    if (roleEl) roleEl.textContent = currentUser.role
        ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
        : 'Staff';

    // ===== AVATAR DISPLAY =====
    if (userAvatar && currentUser.fileURL) {
        if (userAvatar.tagName === 'IMG') {
            userAvatar.src = `${currentUser.fileURL}?v=${Date.now()}`;
        } else {
            userAvatar.style.backgroundImage = `url('${currentUser.fileURL}?v=${Date.now()}')`;
        }
    }

    // ===== AVATAR UPLOAD =====
    if (userAvatar && currentUser) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.title = 'Click to change profile picture';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        userAvatar.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File',
                    text: 'Please upload an image file only.',
                    background: '#2c3e50',
                    color: '#fff'
                });
                return;
            }

            Swal.fire({
                title: 'Uploading...',
                text: 'Please wait while we upload your profile picture.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#2c3e50',
                color: '#fff'
            });

            try {
                const { cloudName, uploadPreset, uploadFolder } = window.cloudinaryConfig;

                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset);
                formData.append('folder', uploadFolder || 'harmonyhub/users');

                const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                const cloudinaryData = await cloudinaryRes.json();
                if (!cloudinaryData.secure_url) throw new Error('Upload failed. Please try again.');

                const fileURL = cloudinaryData.secure_url;

                // --- Update Firebase user
                const usersRef = firebase.database().ref('users');
                const snapshot = await usersRef.once('value');
                let userUID = null;
                snapshot.forEach((child) => {
                    const user = child.val();
                    if (user.email && user.email === currentUser.email) userUID = child.key;
                });
                if (!userUID) throw new Error('User not found in database.');

                const userRef = firebase.database().ref(`/users/${userUID}`);
                await userRef.update({ cloudinaryData, fileURL });

                currentUser.fileURL = fileURL;
                sessionStorage.setItem('authUser', JSON.stringify(currentUser));

                if (userAvatar.tagName === 'IMG') userAvatar.src = `${fileURL}?v=${Date.now()}`;
                else userAvatar.style.backgroundImage = `url('${fileURL}?v=${Date.now()}')`;

                Swal.fire({
                    icon: 'success',
                    title: 'Profile Updated!',
                    text: 'Your profile picture has been uploaded successfully.',
                    background: '#2c3e50',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                });

            } catch (error) {
                console.error('Upload error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Upload Failed',
                    text: error.message,
                    background: '#2c3e50',
                    color: '#fff'
                });
            }
        });
    }

    // ===== SIDEBAR LOGIC =====
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

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-collapsed');
            updateToggleIcon();
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target) &&
            sidebar.classList.contains('mobile-collapsed')) {
            sidebar.classList.remove('mobile-collapsed');
            updateToggleIcon();
        }
    });

    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();

    // ===== LOGOUT =====
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

    // ===== STAFF NOTIFICATIONS =====
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
        if (filter === "unread") filtered = filtered.filter(n => !n.readBy || !n.readBy[currentUser.uid]);
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
                case "resource_upload": renderResourceNotif(n); break;
                case "announcement": renderAnnouncementNotif(n); break;
                case "schedule": renderScheduleNotif(n); break;
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

    notifTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            notifTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            renderNotifications(tab.dataset.tab);
        });
    });

    // ---------------- Notification Renderers ----------------
    function renderRegistrationNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `<p>New user registered: ${data.userName}</p>`;
        notifItem.addEventListener("click", () => markAsRead(data.id));
        notifList.appendChild(notifItem);
    }

    function renderResourceNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `<p>New resource uploaded: ${data.title}</p>`;
        notifItem.addEventListener("click", () => markAsRead(data.id));
        notifList.appendChild(notifItem);
    }

    function renderAnnouncementNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `<p>Announcement: ${data.title}</p>`;
        notifItem.addEventListener("click", () => markAsRead(data.id));
        notifList.appendChild(notifItem);
    }

    function renderScheduleNotif(data){
        const isUnread = !data.readBy || !data.readBy[currentUser.uid];
        const notifItem = document.createElement("div");
        notifItem.className = `notif-item ${isUnread ? "unread" : ""}`;
        notifItem.innerHTML = `<p>New schedule: ${data.title}</p>`;
        notifItem.addEventListener("click", () => markAsRead(data.id));
        notifList.appendChild(notifItem);
    }

    loadNotifications();
});
