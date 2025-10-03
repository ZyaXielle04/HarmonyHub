document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const logoutBtn = document.querySelector('.logout-btn');
    const name = document.querySelector('.user-name');
    const role = document.querySelector('.user-role');

    const userData = JSON.parse(localStorage.getItem('authUser'));
    if (userData){
        name.textContent = userData.name || 'User';
        role.textContent = userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Member';
    }

    // Initial state based on screen size
    checkScreenSize();

    // Window resize
    window.addEventListener('resize', checkScreenSize);

    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-collapsed');
            updateToggleIcon();
        });
    }

    // Click outside to close sidebar on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 1024 &&
            !sidebar.contains(event.target) &&
            !sidebarToggle.contains(event.target) &&
            sidebar.classList.contains('mobile-collapsed')) {
            sidebar.classList.remove('mobile-collapsed');
            updateToggleIcon();
        }
    });

    // Enhanced logout button with SweetAlert
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
                    // Show loading state
                    Swal.fire({
                        title: 'Logging out...',
                        text: 'Please wait while we securely log you out.',
                        icon: 'info',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading()
                        },
                        background: '#2c3e50',
                        color: '#fff'
                    });
                    
                    // Remove all stored user data
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Clear Firebase authentication persistence
                    if (typeof auth !== 'undefined' && auth) {
                        // Set persistence to NONE before signing out
                        auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
                            .then(() => {
                                return auth.signOut();
                            })
                            .then(() => {
                                // Close the loading dialog
                                Swal.close();
                                
                                // Show success message with 2-second delay before redirect
                                Swal.fire({
                                    title: 'Logged Out!',
                                    text: 'You have been successfully logged out. Redirecting in 2 seconds...',
                                    icon: 'success',
                                    confirmButtonColor: '#3085d6',
                                    background: '#2c3e50',
                                    color: '#fff',
                                    iconColor: '#4caf50',
                                    timer: 2000,
                                    timerProgressBar: true,
                                    showConfirmButton: false
                                });
                                
                                // Redirect after 2 seconds
                                setTimeout(() => {
                                    window.location.href = '../index.html?logout=' + Date.now();
                                }, 2000);
                            })
                            .catch((error) => {
                                console.error('Logout error:', error);
                                // Still try to redirect even if there's an error
                                Swal.close();
                                
                                // Show error but still redirect after 2 seconds
                                Swal.fire({
                                    title: 'Logged Out!',
                                    text: 'You have been logged out. Redirecting in 2 seconds...',
                                    icon: 'info',
                                    confirmButtonColor: '#3085d6',
                                    background: '#2c3e50',
                                    color: '#fff',
                                    timer: 2000,
                                    timerProgressBar: true,
                                    showConfirmButton: false
                                });
                                
                                setTimeout(() => {
                                    window.location.href = '../index.html?logout=' + Date.now();
                                }, 2000);
                            });
                    } else {
                        // Fallback if auth is not available
                        Swal.close();
                        
                        // Show success message with 2-second delay
                        Swal.fire({
                            title: 'Logged Out!',
                            text: 'You have been successfully logged out.',
                            icon: 'success',
                            confirmButtonColor: '#3085d6',
                            background: '#2c3e50',
                            color: '#fff',
                            iconColor: '#4caf50',
                            timer: 2000,
                            timerProgressBar: true,
                            showConfirmButton: false
                        });
                        
                        // Redirect after 2 seconds
                        setTimeout(() => {
                            window.location.href = '../index.html?logout=' + Date.now();
                        }, 2000);
                    }
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const notifBtn = document.getElementById("notification-btn");
        const notifDropdown = document.getElementById("notifications-dropdown");

        if (notifBtn && notifDropdown) {
            // Toggle open/close
            notifBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                notifDropdown.style.display =
                    notifDropdown.style.display === "flex" ? "none" : "flex";
            });

            // Close when clicking outside
            document.addEventListener("click", (e) => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.style.display = "none";
                }
            });
        }
    });

    function checkScreenSize() {
        if (window.innerWidth <= 1024) {
            // mobile: sidebar hidden by default
            sidebar.classList.remove('mobile-collapsed');
            if (sidebarToggle) sidebarToggle.style.display = 'flex';
            updateToggleIcon();
        } else {
            // desktop: always visible
            sidebar.classList.remove('mobile-collapsed');
            if (sidebarToggle) sidebarToggle.style.display = 'none';
        }
    }

    function updateToggleIcon() {
        if (window.innerWidth <= 1024) {
            if (sidebar.classList.contains('mobile-collapsed')) {
                sidebarToggle.innerHTML = '<i class="fas fa-times"></i>'; // Close icon
            } else {
                sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>'; // Menu icon
            }
        }
    }
});