// dashboard.js — Harmony Hub Member Dashboard

document.addEventListener('DOMContentLoaded', function () {
    const db = firebase.database();
    const userData = JSON.parse(sessionStorage.getItem('authUser'));

    // Elements
    const memberNameEl = document.getElementById('member-name');
    const upcomingEventsEl = document.getElementById("upcoming-events");
    const resourcesCountEl = document.getElementById('resources-count');
    const meetingsCountEl = document.getElementById('meetings-count');
    const announcementsCountEl = document.getElementById('announcements-count');
    const activityListEl = document.getElementById('activity-list');
    const eventsListEl = document.getElementById('events-list');

    const notificationBtn = document.getElementById('notification-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notifTabs = document.querySelectorAll('.notif-tab');
    const notificationsListEl = document.getElementById('notifications-list');

    // ========================= WELCOME SECTION =========================
    if (userData && userData.name) {
        memberNameEl.textContent = userData.name.split(' ')[0];
    }

    // ========================= DASHBOARD COUNTS =========================
    function loadDashboardCounts() {
        // Count events
        db.ref('events').once('value').then(snapshot => {
            const total = snapshot.exists() ? snapshot.numChildren() : 0;
            upcomingEventsEl.textContent = total;
        });

        // Count resources
        db.ref('resources').once('value').then(snapshot => {
            const total = snapshot.exists() ? snapshot.numChildren() : 0;
            resourcesCountEl.textContent = total;
        });

        // Count meetings
        db.ref('meetings').once('value').then(snapshot => {
            const total = snapshot.exists() ? snapshot.numChildren() : 0;
            meetingsCountEl.textContent = total;
        });

        // Count announcements
        db.ref('announcements').once('value').then(snapshot => {
            const total = snapshot.exists() ? snapshot.numChildren() : 0;
            announcementsCountEl.textContent = total;
        });
    }

    function loadRecentActivity() {
        const activities = [];

        const fetchData = [
            { ref: 'announcements', icon: 'fa-bullhorn', type: 'Announcement', timeField: 'date' },
            { ref: 'resources', icon: 'fa-file-alt', type: 'Resource', timeField: 'uploadDate' },
            { ref: 'schedules', icon: 'fa-calendar-plus', type: 'Schedule', timeField: 'start' },
            { ref: 'meetings', icon: 'fa-video', type: 'Meeting', timeField: 'date' }
        ];

        // Fetch latest 3 from each
        Promise.all(fetchData.map(item =>
            firebase.database().ref(item.ref).limitToLast(3).once('value')
        )).then(snapshots => {
            snapshots.forEach((snap, i) => {
                snap.forEach(child => {
                    const data = child.val();
                    if (data) {
                        let timeValue = data[fetchData[i].timeField];
                        let timestamp = timeValue ? new Date(timeValue).getTime() : Date.now();

                        activities.push({
                            icon: fetchData[i].icon,
                            type: fetchData[i].type,
                            title: data.title || data.name || data.meetingId || 'Untitled',
                            timestamp: timestamp,
                            category: fetchData[i].ref
                        });
                    }
                });
            });

            // Sort by timestamp descending
            activities.sort((a, b) => b.timestamp - a.timestamp);

            // Display only 3 latest items
            renderActivityList(activities.slice(0, 3));

            // Store all for "View All"
            window.allRecentActivities = activities;
        }).catch(err => console.error('Activity Load Error:', err));
    }

    document.getElementById('view-all-activity').addEventListener('click', () => {
        if (!window.allRecentActivities) return;

        const modalContent = document.createElement('div');
        modalContent.className = 'activity-modal-content';

        const categories = ['announcements', 'resources', 'schedules', 'meetings'];

        categories.forEach(cat => {
            const catActivities = window.allRecentActivities
                .filter(a => a.category === cat)
                .sort((a,b) => b.timestamp - a.timestamp);

            if (catActivities.length) {
                const section = document.createElement('div');
                section.innerHTML = `<h4>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h4>`;
                
                catActivities.forEach(act => {
                    const timeAgo = getTimeAgo(act.timestamp);
                    const item = document.createElement('div');
                    item.className = 'activity-item';
                    item.innerHTML = `
                        <div class="activity-icon"><i class="fas ${act.icon}"></i></div>
                        <div class="activity-content">
                            <p>New ${act.type}: ${act.title}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    `;
                    section.appendChild(item);
                });

                modalContent.appendChild(section);
            }
        });

        // Open SweetAlert2 modal
        Swal.fire({
            title: 'All Recent Activity',
            html: modalContent,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup: 'activity-modal'
            }
        });
    });

    // Helper to render a list of activities
    function renderActivityList(activityArray) {
        const activityListEl = document.getElementById('activity-list');
        activityListEl.innerHTML = '';
        activityArray.forEach(act => {
            const timeAgo = getTimeAgo(act.timestamp);
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon"><i class="fas ${act.icon}"></i></div>
                <div class="activity-content">
                    <p>New ${act.type}: ${act.title}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            `;
            activityListEl.appendChild(item);
        });
    }

    // ========================= UPCOMING EVENTS =========================
    function loadUpcomingEvents() {
        const now = new Date();

        firebase.database().ref("schedules").orderByChild('start').once("value")
        .then(snapshot => {
            let count = 0;
            eventsListEl.innerHTML = ''; // clear existing events

            snapshot.forEach(child => {
                const schedule = child.val();
                if (!schedule.start) return;

                const startDate = new Date(schedule.start);
                if (startDate >= now) {
                    count++;

                    const day = startDate.getDate();
                    const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTime = schedule.end ? new Date(schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const location = schedule.location || 'TBA';
                    const title = schedule.title || 'Untitled Event';

                    const eventItem = document.createElement('div');
                    eventItem.className = 'event-item';
                    eventItem.innerHTML = `
                        <div class="event-date">
                            <span class="event-day">${day}</span>
                            <span class="event-month">${month}</span>
                        </div>
                        <div class="event-details">
                            <h4>${title}</h4>
                            <p>${startTime}${endTime ? ' - ' + endTime : ''}</p>
                            <span class="event-location">${location}</span>
                        </div>
                        <button class="event-action">RSVP</button>
                    `;
                    eventsListEl.appendChild(eventItem);
                }
            });

            upcomingEventsEl.textContent = count;

            // If no upcoming events
            if (count === 0) {
                eventsListEl.innerHTML = `<p class="no-data">No upcoming events.</p>`;
            }
        }).catch(err => console.error('Error loading upcoming events:', err));
    }

    // ========================= NOTIFICATIONS =========================
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            notificationsDropdown.classList.toggle('active');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', e => {
        if (
            notificationsDropdown &&
            !notificationsDropdown.contains(e.target) &&
            !notificationBtn.contains(e.target)
        ) {
            notificationsDropdown.classList.remove('active');
        }
    });

    // Tab switching
    notifTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            notifTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabType = tab.dataset.tab;
            loadNotifications(tabType);
        });
    });

    function loadNotifications(filter = 'all') {
        const ref = db.ref('notifications');
        ref.limitToLast(10).once('value').then(snapshot => {
            notificationsListEl.innerHTML = '';
            if (!snapshot.exists()) {
                notificationsListEl.innerHTML = `<p class="no-data">No notifications yet.</p>`;
                return;
            }

            snapshot.forEach(child => {
                const notif = child.val();
                if (filter === 'unread' && notif.read) return;

                const item = document.createElement('div');
                item.className = `notification-item ${notif.read ? '' : 'unread'}`;
                item.innerHTML = `
                    <div class="notif-icon"><i class="fas fa-bell"></i></div>
                    <div class="notif-details">
                        <p>${notif.message || 'New notification'}</p>
                        <span class="notif-time">${getTimeAgo(notif.timestamp)}</span>
                    </div>
                `;
                notificationsListEl.prepend(item);
            });
        });
    }

    // ========================= HELPERS =========================
    function getTimeAgo(timestamp) {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 },
        ];
        for (const i of intervals) {
            const count = Math.floor(seconds / i.seconds);
            if (count >= 1) {
                return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    }

    // ========================= INIT =========================
    loadDashboardCounts();
    loadRecentActivity();
    loadUpcomingEvents();
    loadNotifications('all');
});
