// ===================== DASHBOARD.JS (Staff/Admin) =====================
document.addEventListener('DOMContentLoaded', function () {
    const upcomingEventsEl = document.getElementById('upcoming-events');
    const resourcesCountEl = document.getElementById('resources-count');
    const meetingsCountEl = document.getElementById('meetings-count');
    const announcementsCountEl = document.getElementById('announcements-count');
    const eventsListEl = document.getElementById('events-list');
    const activityListEl = document.getElementById('activity-list');
    const viewAllBtn = document.getElementById('view-all-activity'); // Button for View All

    let showAll = false;
    let allActivities = [];

    // ===================== LOAD UPCOMING EVENTS =====================
    function loadUpcomingEvents() {
        const now = new Date();
        const schedulesRef = firebase.database().ref('schedules');

        schedulesRef.orderByChild('start').once('value')
            .then(snapshot => {
                let count = 0;
                eventsListEl.innerHTML = ''; // Clear existing events

                snapshot.forEach(child => {
                    const schedule = child.val();
                    if (!schedule.start) return;

                    const startDate = new Date(schedule.start);
                    if (startDate >= now) {
                        count++;

                        const day = startDate.getDate();
                        const month = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                        const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        let endTime = '';
                        if (schedule.end) {
                            endTime = new Date(schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }

                        const location = schedule.location || 'TBA';
                        const title = schedule.title || 'Untitled Event';

                        const eventItem = document.createElement('div');
                        eventItem.classList.add('event-item');
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

                if (count === 0) {
                    eventsListEl.innerHTML = `<p class="no-data">No upcoming events.</p>`;
                }
            })
            .catch(err => console.error('Error loading upcoming events:', err));
    }

    // ===================== LOAD RESOURCES COUNT =====================
    function loadResourcesCount() {
        firebase.database().ref('resources').once('value', snapshot => {
            resourcesCountEl.textContent = snapshot.numChildren();
        });
    }

    // ===================== LOAD MEETINGS COUNT =====================
    function loadMeetingsCount() {
        firebase.database().ref('meetings').once('value', snapshot => {
            meetingsCountEl.textContent = snapshot.numChildren();
        });
    }

    // ===================== LOAD ANNOUNCEMENTS COUNT =====================
    function loadAnnouncementsCount() {
        firebase.database().ref('announcements').once('value', snapshot => {
            announcementsCountEl.textContent = snapshot.numChildren();
        });
    }

    // ===================== LOAD RECENT ACTIVITY =====================
    function loadRecentActivity() {
        const activityRef = firebase.database().ref('activity_table');

        activityRef
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value')
            .then(snapshot => {
                const allowedTypes = ['activity', 'announcement', 'meeting', 'schedule', 'resource_upload'];
                const activities = [];

                snapshot.forEach(child => {
                    const data = child.val();
                    if (!data || !data.type || !data.timestamp) return;
                    if (allowedTypes.includes(data.type)) {
                        activities.push({ id: child.key, ...data });
                    }
                });

                // Sort newest first
                activities.sort((a, b) => b.timestamp - a.timestamp);
                allActivities = activities;

                renderActivityList();
            })
            .catch(err => {
                console.error('Error loading recent activity:', err);
                activityListEl.innerHTML = `<p class="no-data">Failed to load activity.</p>`;
            });
    }

    // ===================== RENDER ACTIVITY LIST =====================
    function renderActivityList() {
        const toShow = showAll ? allActivities : allActivities.slice(0, 3);
        activityListEl.innerHTML = '';

        if (toShow.length === 0) {
            activityListEl.innerHTML = `<p class="no-data">No recent activity.</p>`;
            return;
        }

        toShow.forEach(activity => {
            const timeAgo = getTimeAgo(activity.timestamp);
            const icon = getActivityIcon(activity.type);
            const message = getActivityMessage(activity);

            const item = document.createElement('div');
            item.classList.add('activity-item');
            item.innerHTML = `
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <p>${message}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            `;
            activityListEl.appendChild(item);
        });

        // Update button label
        if (viewAllBtn) {
            viewAllBtn.textContent = showAll ? 'Show Less' : 'View All';
            viewAllBtn.style.display = allActivities.length > 3 ? 'block' : 'none';
        }
    }

    // ===================== VIEW ALL BUTTON HANDLER =====================
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            showAll = !showAll;
            renderActivityList();
        });
    }

    // ===================== HELPER FUNCTIONS =====================
    function getActivityIcon(type) {
        switch (type) {
            case 'announcement': return `<i class="fas fa-bullhorn"></i>`;
            case 'meeting': return `<i class="fas fa-video"></i>`;
            case 'schedule': return `<i class="fas fa-calendar-alt"></i>`;
            case 'resource_upload': return `<i class="fas fa-file-upload"></i>`;
            default: return `<i class="fas fa-bolt"></i>`;
        }
    }

    function getActivityMessage(activity) {
        const title = activity.title || 'Untitled';
        switch (activity.type) {
            case 'announcement': return `New announcement: ${title}`;
            case 'meeting': return `Meeting scheduled: ${title}`;
            case 'schedule': return `Event added: ${title}`;
            case 'resource_upload': return `New resource uploaded: ${title}`;
            default: return `Activity update: ${title}`;
        }
    }

    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // ===================== INITIALIZE DASHBOARD =====================
    function initDashboard() {
        loadUpcomingEvents();
        loadResourcesCount();
        loadMeetingsCount();
        loadAnnouncementsCount();
        loadRecentActivity();
    }

    // Run once on page load
    initDashboard();

    // Optional: Auto-refresh every 60 seconds
    setInterval(() => {
        initDashboard();
    }, 60000);
});
