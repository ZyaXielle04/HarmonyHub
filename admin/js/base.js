document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.querySelector('.logout-btn');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');
    const userAvatar = document.querySelector('.user-avatar');

    // ===== AUTH USER LOADING =====
    const userDataRaw = sessionStorage.getItem('authUser');
    let userData = null;

    try {
        if (userDataRaw) userData = JSON.parse(userDataRaw);
    } catch (err) {
        console.error('Error parsing authUser:', err);
    }

    if (userData) {
        // ===== DISPLAY NAME =====
        if (nameEl) {
            nameEl.textContent = userData.name?.trim() || 'User';
        }

        // ===== DISPLAY ROLE =====
        if (roleEl) {
            if (userData.role) {
                const capitalized =
                    userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
                roleEl.textContent = capitalized;
            } else {
                roleEl.textContent = 'Admin';
            }
        }

        // ===== AVATAR DISPLAY =====
        if (userAvatar && userData.fileURL) {
            const avatarURL = `${userData.fileURL}?v=${Date.now()}`;
            if (userAvatar.tagName === 'IMG') {
                userAvatar.src = avatarURL;
            } else {
                userAvatar.style.backgroundImage = `url('${avatarURL}')`;
                userAvatar.style.backgroundSize = 'cover';
                userAvatar.style.backgroundPosition = 'center';
            }
        }
    } else {
        console.warn('No authUser found in sessionStorage.');
    }

    // ===== SIDEBAR RESPONSIVENESS =====
    function checkScreenSize() {
        if (!sidebar || !sidebarToggle) return;
        if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-collapsed');
            sidebarToggle.style.display = 'flex';
            updateToggleIcon();
        } else {
            sidebar.classList.remove('mobile-collapsed');
            sidebarToggle.style.display = 'none';
        }
    }

    function updateToggleIcon() {
        if (!sidebarToggle || window.innerWidth > 1024) return;
        sidebarToggle.innerHTML = sidebar.classList.contains('mobile-collapsed')
            ? '<i class="fas fa-times"></i>'
            : '<i class="fas fa-bars"></i>';
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-collapsed');
            updateToggleIcon();
        });
    }

    document.addEventListener('click', (event) => {
        if (
            window.innerWidth <= 1024 &&
            sidebar &&
            !sidebar.contains(event.target) &&
            sidebarToggle &&
            !sidebarToggle.contains(event.target) &&
            sidebar.classList.contains('mobile-collapsed')
        ) {
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
                            .then(() => redirectLogout())
                            .catch(() => redirectLogout());
                    } else {
                        redirectLogout();
                    }
                }
            });
        });
    }

    function redirectLogout() {
        Swal.close();
        Swal.fire({
            title: 'Logged Out!',
            text: 'Redirecting in 2 seconds...',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            background: '#2c3e50',
            color: '#fff'
        });
        setTimeout(() => {
            window.location.href = '../index.html?logout=' + Date.now();
        }, 2000);
    }
});
