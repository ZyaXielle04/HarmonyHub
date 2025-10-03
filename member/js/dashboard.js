// Member Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    initializeFirebase();
    
    // Check authentication status
    checkAuthStatus();
    
    // Load dashboard data
    loadDashboardData();
    
    // Set up event listeners
    setupEventListeners();
});

function initializeFirebase() {
    // Firebase initialization code (same as in admin)
    // This would be handled by firebase-config.js
}

function checkAuthStatus() {
    // Check if user is authenticated and has member role
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            checkUserRole(user.uid);
        } else {
            // No user is signed in, redirect to login
            window.location.href = '../login.html';
        }
    });
}

function checkUserRole(uid) {
    // Check if user has member role
    const userRef = firebase.database().ref('users/' + uid);
    userRef.once('value').then(function(snapshot) {
        const userData = snapshot.val();
        if (userData && userData.role === 'member') {
            // User is a member, load their data
            loadUserData(userData);
        } else {
            // User doesn't have member role, redirect
            window.location.href = '../unauthorized.html';
        }
    });
}

function loadUserData(userData) {
    // Update UI with user data
    document.getElementById('member-name').textContent = userData.name || 'Member';
    document.querySelector('.user-name').textContent = userData.name || 'Member User';
    
    // Set user avatar initials
    const avatar = document.querySelector('.user-avatar');
    if (userData.name) {
        const initials = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
        avatar.textContent = initials.substring(0, 2);
    }
}

function loadDashboardData() {
    // Load statistics and recent activity
    loadStatistics();
    loadRecentActivity();
    loadUpcomingEvents();
}

function loadStatistics() {
    // Load counts for dashboard stats
    // This would query Firebase for actual data
    // For now, using placeholder values
    
    document.getElementById('upcoming-events').textContent = '3';
    document.getElementById('resources-count').textContent = '24';
    document.getElementById('meetings-count').textContent = '2';
    document.getElementById('announcements-count').textContent = '5';
}

function loadRecentActivity() {
    // Load recent activity from Firebase
    // This is a placeholder implementation
    const activityList = document.getElementById('activity-list');
    
    // In a real implementation, this would query Firebase
    // and dynamically create activity items
}

function loadUpcomingEvents() {
    // Load upcoming events from Firebase
    // This is a placeholder implementation
    const eventsList = document.getElementById('events-list');
    
    // In a real implementation, this would query Firebase
    // and dynamically create event items
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        logoutUser();
    });
    
    // Notification button
    document.getElementById('notification-btn').addEventListener('click', toggleNotifications);
    
    // Event RSVP buttons
    document.querySelectorAll('.event-action').forEach(button => {
        button.addEventListener('click', function() {
            const eventName = this.closest('.event-item').querySelector('h4').textContent;
            rsvpToEvent(eventName);
        });
    });
    
    // Sidebar toggle
    document.querySelector('.sidebar-toggle').addEventListener('click', toggleSidebar);
}

function logoutUser() {
    firebase.auth().signOut().then(function() {
        // Sign-out successful
        window.location.href = '../login.html';
    }).catch(function(error) {
        // An error happened
        console.error('Logout error:', error);
    });
}

function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function rsvpToEvent(eventName) {
    // Handle RSVP to event
    Swal.fire({
        title: 'RSVP Confirmation',
        text: `Are you sure you want to RSVP to "${eventName}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, RSVP',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // In a real implementation, this would update Firebase
            Swal.fire(
                'Success!',
                `You have successfully RSVP'd to ${eventName}`,
                'success'
            );
        }
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}